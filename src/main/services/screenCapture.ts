/**
 * =============================================================================
 * SCREEN CAPTURE SERVICE
 * =============================================================================
 *
 * Captures screenshots based on user activity for the AI suggestion pipeline.
 * Implements the same capture logic as the original gum-backend Python service.
 *
 * CAPTURE STRATEGY:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  THREAD 1: FRAME BUFFER (10 FPS)                                        │
 * │  ┌─────────────────────────────────────────────────────────────────┐   │
 * │  │  - Continuously captures frames to memory                       │   │
 * │  │  - Keeps latest frame for "before" capture                      │   │
 * │  │  - Does NOT save to disk (just buffers in RAM)                  │   │
 * │  └─────────────────────────────────────────────────────────────────┘   │
 * │                                                                         │
 * │  THREAD 2: PERIODIC CAPTURE (every 30s)                                 │
 * │  ┌─────────────────────────────────────────────────────────────────┐   │
 * │  │  - Saves a screenshot every 30 seconds                          │   │
 * │  │  - Provides baseline coverage during idle periods               │   │
 * │  │  - Filename: frame_<timestamp>_periodic.jpg                     │   │
 * │  └─────────────────────────────────────────────────────────────────┘   │
 * │                                                                         │
 * │  THREAD 3: MOUSE MOVEMENT TRACKING (polling at 50ms)                    │
 * │  ┌─────────────────────────────────────────────────────────────────┐   │
 * │  │  - Polls cursor position                                        │   │
 * │  │  - Triggers capture on significant movement (>10px)             │   │
 * │  │  - Uses Electron's screen.getCursorScreenPoint()                │   │
 * │  └─────────────────────────────────────────────────────────────────┘   │
 * │                                                                         │
 * │  THREAD 4: NATIVE MOUSE HOOKS (via uiohook-napi)                        │
 * │  ┌─────────────────────────────────────────────────────────────────┐   │
 * │  │  - Detects mouse clicks (any button)                            │   │
 * │  │  - Detects scroll wheel events                                  │   │
 * │  │  - Global hooks work even when app not focused                  │   │
 * │  └─────────────────────────────────────────────────────────────────┘   │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * DEBOUNCE LOGIC:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  Mouse Event Detected                                                   │
 * │         │                                                               │
 * │         ▼                                                               │
 * │  ┌─────────────────────────────────────────────────────────────────┐   │
 * │  │  If FIRST event in burst:                                       │   │
 * │  │    - Save buffered frame as "before"                            │   │
 * │  │    - Start 3-second debounce timer                              │   │
 * │  │                                                                 │   │
 * │  │  If ONGOING burst:                                              │   │
 * │  │    - Update coordinates                                         │   │
 * │  │    - Reset debounce timer                                       │   │
 * │  └─────────────────────────────────────────────────────────────────┘   │
 * │         │                                                               │
 * │         ▼ (after 3 seconds of no events)                               │
 * │  ┌─────────────────────────────────────────────────────────────────┐   │
 * │  │  Debounce fires:                                                │   │
 * │  │    - Capture current screen as "after"                          │   │
 * │  │    - Save both frames to disk                                   │   │
 * │  │    - Record event metadata                                      │   │
 * │  └─────────────────────────────────────────────────────────────────┘   │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * PRIVACY:
 * - Skips all captures when the GUMBO app window is focused
 * - User is viewing their own app, not doing work we should analyze
 *
 * @module services/screenCapture
 */

import { desktopCapturer, BrowserWindow, screen } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { dataStore } from './dataStore'
import { uIOhook, UiohookMouseEvent, UiohookWheelEvent } from 'uiohook-napi'

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * A pending mouse event waiting for debounce completion.
 */
interface PendingEvent {
  /** Event type (move, click, scroll) */
  type: 'move' | 'click' | 'scroll'
  /** X coordinate of event */
  x: number
  /** Y coordinate of event */
  y: number
  /** Timestamp when event was first detected */
  timestamp: number
  /** Buffered frame captured before the event */
  beforeFrame: Buffer | null
  /** Timestamp of the before frame */
  beforeTimestamp: number
}

/**
 * Metadata recorded for each capture event.
 */
interface EventRecord {
  /** Type of mouse event */
  eventType: string
  /** X coordinate */
  x: number
  /** Y coordinate */
  y: number
  /** When the event occurred */
  timestampEvent: number
  /** When the "before" frame was captured */
  timestampBefore: number
  /** Filename of the "before" screenshot */
  beforeFilename: string
  /** When the "after" frame was captured */
  timestampAfter: number
  /** Filename of the "after" screenshot */
  afterFilename: string
}

// =============================================================================
// CONFIGURATION
// =============================================================================

/** Frame buffer capture rate (10 FPS) */
const FRAME_BUFFER_INTERVAL_MS = 100

/** Periodic capture interval (30 seconds) */
const PERIODIC_CAPTURE_INTERVAL_MS = 30000

/** Debounce delay after last activity (3 seconds) */
const DEBOUNCE_DELAY_MS = 3000

/** Mouse position polling interval (50ms) */
const MOUSE_POLL_INTERVAL_MS = 50

/** Minimum mouse movement to count as activity (10 pixels) */
const MOUSE_MOVE_THRESHOLD = 10

/** Maximum screenshots to keep (cleanup older ones) */
const MAX_SCREENSHOTS = 100

// =============================================================================
// SCREEN CAPTURE SERVICE CLASS
// =============================================================================

/**
 * Service for capturing screenshots based on user activity.
 *
 * USAGE:
 * ```typescript
 * import { screenCaptureService } from './services/screenCapture'
 *
 * // Start capturing
 * screenCaptureService.start()
 *
 * // Check status
 * if (screenCaptureService.isActive()) {
 *   console.log('Recording in progress')
 * }
 *
 * // Stop capturing
 * screenCaptureService.stop()
 *
 * // Listen for status changes
 * const unsubscribe = screenCaptureService.onStatusChange((isRecording) => {
 *   console.log('Recording status:', isRecording)
 * })
 * ```
 */
class ScreenCaptureService {
  // ---------------------------------------------------------------------------
  // Private State
  // ---------------------------------------------------------------------------

  /** Whether recording is currently active */
  private isRecording = false

  /** Listeners for recording status changes */
  private statusListeners: Set<(isRecording: boolean) => void> = new Set()

  /** Latest captured frame (for "before" captures) */
  private latestFrame: Buffer | null = null

  /** Timestamp of the latest frame */
  private latestFrameTimestamp: number = 0

  /** Interval for frame buffer captures */
  private frameBufferInterval: NodeJS.Timeout | null = null

  /** Interval for periodic captures */
  private periodicCaptureInterval: NodeJS.Timeout | null = null

  /** Timer for debounced captures */
  private debounceTimer: NodeJS.Timeout | null = null

  /** Pending event waiting for debounce completion */
  private pendingEvent: PendingEvent | null = null

  /** Last known mouse position (for movement detection) */
  private lastMousePosition: { x: number; y: number } = { x: 0, y: 0 }

  /** Interval for mouse position polling */
  private mousePollingInterval: NodeJS.Timeout | null = null

  /** Whether uiohook is currently running */
  private uiohookStarted = false

  /** Recorded events for metadata tracking */
  private eventRecords: EventRecord[] = []

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Checks if recording is currently active.
   *
   * @returns True if recording is active
   */
  isActive(): boolean {
    return this.isRecording
  }

  /**
   * Subscribes to recording status changes.
   *
   * @param listener - Callback invoked when status changes
   * @returns Cleanup function to unsubscribe
   */
  onStatusChange(listener: (isRecording: boolean) => void): () => void {
    this.statusListeners.add(listener)
    return () => this.statusListeners.delete(listener)
  }

  /**
   * Starts screen capture.
   *
   * Activates:
   * - Frame buffer (10 FPS in-memory captures)
   * - Periodic captures (every 30s to disk)
   * - Mouse movement tracking (polling)
   * - Native mouse hooks (clicks/scrolls)
   */
  start(): void {
    if (this.isRecording) return

    console.log('Starting screen capture service (gum-backend style)')
    this.isRecording = true
    this.notifyStatusChange()

    // Start all capture threads
    this.startFrameBuffer()
    this.startPeriodicCapture()
    this.startMouseMovementTracking()
    this.startNativeMouseHook()

    console.log('Screen capture service started with:')
    console.log(`  - Frame buffer: ${1000 / FRAME_BUFFER_INTERVAL_MS} FPS`)
    console.log(`  - Periodic capture: every ${PERIODIC_CAPTURE_INTERVAL_MS / 1000}s`)
    console.log(`  - Debounce delay: ${DEBOUNCE_DELAY_MS / 1000}s`)
    console.log(`  - Native mouse hooks: clicks and scrolls`)
  }

  /**
   * Stops screen capture.
   *
   * Clears all intervals/timers and stops native hooks.
   */
  stop(): void {
    if (!this.isRecording) return

    console.log('Stopping screen capture service')
    this.isRecording = false
    this.notifyStatusChange()

    // Stop all intervals
    if (this.frameBufferInterval) {
      clearInterval(this.frameBufferInterval)
      this.frameBufferInterval = null
    }

    if (this.periodicCaptureInterval) {
      clearInterval(this.periodicCaptureInterval)
      this.periodicCaptureInterval = null
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }

    if (this.mousePollingInterval) {
      clearInterval(this.mousePollingInterval)
      this.mousePollingInterval = null
    }

    // Stop native hook
    this.stopNativeMouseHook()

    // Clear state
    this.latestFrame = null
    this.pendingEvent = null
  }

  // ---------------------------------------------------------------------------
  // Thread 1: Frame Buffer
  // ---------------------------------------------------------------------------

  /**
   * Starts the continuous frame buffer.
   *
   * Captures frames at ~10 FPS and keeps the latest one in memory.
   * This provides "before" frames for debounced event captures.
   */
  private startFrameBuffer(): void {
    this.frameBufferInterval = setInterval(async () => {
      // Skip if app is focused (privacy)
      if (this.isAppFocused()) {
        return
      }

      try {
        const frame = await this.captureFrameToBuffer()
        if (frame) {
          this.latestFrame = frame
          this.latestFrameTimestamp = Date.now()
        }
      } catch {
        // Silent fail for buffer captures - non-critical
      }
    }, FRAME_BUFFER_INTERVAL_MS)
  }

  // ---------------------------------------------------------------------------
  // Thread 2: Periodic Capture
  // ---------------------------------------------------------------------------

  /**
   * Starts periodic captures.
   *
   * Captures and saves a screenshot every 30 seconds regardless of activity.
   * Useful for detecting changes during idle periods.
   */
  private startPeriodicCapture(): void {
    // Capture immediately on start
    this.captureAndSave('periodic')

    this.periodicCaptureInterval = setInterval(() => {
      // Skip if app is focused
      if (this.isAppFocused()) {
        console.log('Periodic capture skipped - app is focused')
        return
      }

      this.captureAndSave('periodic')
    }, PERIODIC_CAPTURE_INTERVAL_MS)
  }

  // ---------------------------------------------------------------------------
  // Thread 3: Mouse Movement Tracking
  // ---------------------------------------------------------------------------

  /**
   * Starts mouse movement detection via polling.
   *
   * Polls cursor position and triggers events on significant movement.
   */
  private startMouseMovementTracking(): void {
    // Get initial position
    const initialPos = screen.getCursorScreenPoint()
    this.lastMousePosition = { x: initialPos.x, y: initialPos.y }

    this.mousePollingInterval = setInterval(() => {
      const currentPos = screen.getCursorScreenPoint()

      // Calculate movement distance
      const dx = Math.abs(currentPos.x - this.lastMousePosition.x)
      const dy = Math.abs(currentPos.y - this.lastMousePosition.y)
      const distance = Math.sqrt(dx * dx + dy * dy)

      // If significant movement detected, trigger event
      if (distance >= MOUSE_MOVE_THRESHOLD) {
        this.onMouseEvent('move', currentPos.x, currentPos.y)
        this.lastMousePosition = { x: currentPos.x, y: currentPos.y }
      }
    }, MOUSE_POLL_INTERVAL_MS)
  }

  // ---------------------------------------------------------------------------
  // Thread 4: Native Mouse Hooks
  // ---------------------------------------------------------------------------

  /**
   * Starts native mouse hooks for clicks and scrolls.
   *
   * Uses uiohook-napi for global mouse event detection.
   */
  private startNativeMouseHook(): void {
    if (this.uiohookStarted) return

    try {
      // Mouse click handler
      uIOhook.on('mousedown', (event: UiohookMouseEvent) => {
        if (!this.isRecording) return
        console.log(`Mouse click detected at (${event.x}, ${event.y}) button=${event.button}`)
        this.onMouseEvent('click', event.x, event.y)
      })

      // Mouse scroll handler
      uIOhook.on('wheel', (event: UiohookWheelEvent) => {
        if (!this.isRecording) return
        console.log(`Mouse scroll detected at (${event.x}, ${event.y}) delta=${event.rotation}`)
        this.onMouseEvent('scroll', event.x, event.y)
      })

      // Start the hook
      uIOhook.start()
      this.uiohookStarted = true
      console.log('Native mouse hook started (clicks + scrolls)')
    } catch (error) {
      console.error('Failed to start native mouse hook:', error)
      console.log('Falling back to movement-only detection')
    }
  }

  /**
   * Stops the native mouse hook.
   */
  private stopNativeMouseHook(): void {
    if (!this.uiohookStarted) return

    try {
      uIOhook.stop()
      this.uiohookStarted = false
      console.log('Native mouse hook stopped')
    } catch (error) {
      console.error('Failed to stop native mouse hook:', error)
    }
  }

  // ---------------------------------------------------------------------------
  // Event Handling & Debounce
  // ---------------------------------------------------------------------------

  /**
   * Handles a mouse event.
   *
   * Implements the debounce logic: first event captures "before" frame,
   * subsequent events reset the timer, and after 3s of inactivity the
   * "after" frame is captured.
   *
   * @param type - Event type (move, click, scroll)
   * @param x - X coordinate
   * @param y - Y coordinate
   */
  onMouseEvent(type: 'move' | 'click' | 'scroll', x: number, y: number): void {
    if (!this.isRecording) return

    // Skip if app is focused
    if (this.isAppFocused()) {
      return
    }

    const now = Date.now()

    if (this.pendingEvent === null) {
      // First event in a new burst - capture "before" frame
      console.log(`Mouse ${type} detected at (${x}, ${y}) - starting new capture burst`)

      this.pendingEvent = {
        type,
        x,
        y,
        timestamp: now,
        beforeFrame: this.latestFrame,
        beforeTimestamp: this.latestFrameTimestamp
      }
    } else {
      // Ongoing burst - just update coordinates
      this.pendingEvent.x = x
      this.pendingEvent.y = y
      this.pendingEvent.type = type
    }

    // Reset debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }

    this.debounceTimer = setTimeout(() => {
      this.debouncedCapture()
    }, DEBOUNCE_DELAY_MS)
  }

  /**
   * Called after debounce delay expires.
   *
   * Captures the "after" frame and saves both frames to disk.
   */
  private async debouncedCapture(): Promise<void> {
    if (!this.pendingEvent) return

    const event = this.pendingEvent
    this.pendingEvent = null
    this.debounceTimer = null

    // Skip if app is focused
    if (this.isAppFocused()) {
      console.log('Debounced capture skipped - app is focused')
      return
    }

    console.log(`Debounced capture triggered for ${event.type} event`)

    try {
      // Capture "after" frame
      const afterFrame = await this.captureFrameToBuffer()
      if (!afterFrame) {
        console.log('Failed to capture after frame')
        return
      }

      const afterTimestamp = Date.now()
      const screenshotsDir = dataStore.getScreenshotsDir()

      // Save "before" frame if we have one
      let beforeFilename = ''
      if (event.beforeFrame) {
        beforeFilename = `frame_${event.beforeTimestamp}_before.jpg`
        await fs.promises.writeFile(path.join(screenshotsDir, beforeFilename), event.beforeFrame)
      }

      // Save "after" frame
      const afterFilename = `frame_${afterTimestamp}_after.jpg`
      await fs.promises.writeFile(path.join(screenshotsDir, afterFilename), afterFrame)

      console.log(`Saved: ${beforeFilename || '(no before)'} -> ${afterFilename}`)

      // Record event metadata
      const record: EventRecord = {
        eventType: event.type,
        x: event.x,
        y: event.y,
        timestampEvent: event.timestamp,
        timestampBefore: event.beforeTimestamp,
        beforeFilename,
        timestampAfter: afterTimestamp,
        afterFilename
      }

      this.eventRecords.push(record)

      // Save event records periodically
      if (this.eventRecords.length % 10 === 0) {
        await this.saveEventRecords()
      }

      // Cleanup old screenshots
      await this.cleanupOldScreenshots()
    } catch (error) {
      console.error('Failed to complete debounced capture:', error)
    }
  }

  // ---------------------------------------------------------------------------
  // Capture Utilities
  // ---------------------------------------------------------------------------

  /**
   * Captures a frame to memory buffer.
   *
   * @returns JPEG buffer or null if capture failed
   */
  private async captureFrameToBuffer(): Promise<Buffer | null> {
    try {
      const primaryDisplay = screen.getPrimaryDisplay()
      const { width, height } = primaryDisplay.size

      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width, height }
      })

      if (sources.length === 0) return null

      const thumbnail = sources[0].thumbnail
      if (thumbnail.isEmpty()) return null

      return thumbnail.toJPEG(85)
    } catch {
      return null
    }
  }

  /**
   * Captures and immediately saves a screenshot.
   *
   * Used for periodic captures.
   *
   * @param reason - Reason for capture (used in filename)
   */
  private async captureAndSave(reason: string): Promise<void> {
    try {
      const frame = await this.captureFrameToBuffer()
      if (!frame) {
        console.log(`${reason} capture failed - no frame`)
        return
      }

      const timestamp = Date.now()
      const filename = `frame_${timestamp}_${reason}.jpg`
      const filepath = path.join(dataStore.getScreenshotsDir(), filename)

      await fs.promises.writeFile(filepath, frame)
      console.log(`${reason} capture saved: ${filename}`)

      await this.cleanupOldScreenshots()
    } catch (error) {
      console.error(`Failed ${reason} capture:`, error)
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Checks if the app window is currently focused.
   *
   * Used to skip captures when user is interacting with GUMBO itself.
   *
   * @returns True if a GUMBO window is focused
   */
  private isAppFocused(): boolean {
    const focusedWindow = BrowserWindow.getFocusedWindow()
    return focusedWindow !== null
  }

  /**
   * Notifies all status listeners of a change.
   */
  private notifyStatusChange(): void {
    for (const listener of this.statusListeners) {
      try {
        listener(this.isRecording)
      } catch (error) {
        console.error('Error in status change listener:', error)
      }
    }
  }

  /**
   * Saves event records to disk.
   */
  private async saveEventRecords(): Promise<void> {
    try {
      const recordsPath = path.join(dataStore.getDataDir(), 'event_records.json')
      await fs.promises.writeFile(recordsPath, JSON.stringify(this.eventRecords, null, 2))
    } catch (error) {
      console.error('Failed to save event records:', error)
    }
  }

  /**
   * Cleans up old screenshots (keeps last 100).
   */
  private async cleanupOldScreenshots(): Promise<void> {
    try {
      const screenshotsDir = dataStore.getScreenshotsDir()
      const files = await fs.promises.readdir(screenshotsDir)

      const frameFiles = files.filter((f) => f.startsWith('frame_') && f.endsWith('.jpg')).sort()

      if (frameFiles.length > MAX_SCREENSHOTS) {
        const toDelete = frameFiles.slice(0, frameFiles.length - MAX_SCREENSHOTS)
        for (const file of toDelete) {
          await fs.promises.unlink(path.join(screenshotsDir, file))
        }
        console.log(`Cleaned up ${toDelete.length} old screenshots`)
      }
    } catch (error) {
      console.error('Failed to cleanup old screenshots:', error)
    }
  }

  // ---------------------------------------------------------------------------
  // Public Utilities
  // ---------------------------------------------------------------------------

  /**
   * Backward compatibility: trigger activity event.
   *
   * @deprecated Use onMouseEvent directly
   */
  onActivity(): void {
    if (!this.isRecording) return
    const pos = screen.getCursorScreenPoint()
    this.onMouseEvent('move', pos.x, pos.y)
  }

  /**
   * Gets list of recent screenshots.
   *
   * @param limit - Maximum number of screenshots to return
   * @returns Array of screenshot file paths
   */
  async getRecentScreenshots(limit = 10): Promise<string[]> {
    try {
      const screenshotsDir = dataStore.getScreenshotsDir()
      const files = await fs.promises.readdir(screenshotsDir)

      const frameFiles = files
        .filter((f) => f.startsWith('frame_') && f.endsWith('.jpg'))
        .sort()
        .reverse()
        .slice(0, limit)

      return frameFiles.map((f) => path.join(screenshotsDir, f))
    } catch {
      return []
    }
  }

  /**
   * Manually triggers a click event.
   *
   * Can be called from IPC for testing.
   */
  onClickEvent(x: number, y: number): void {
    this.onMouseEvent('click', x, y)
  }

  /**
   * Manually triggers a scroll event.
   *
   * Can be called from IPC for testing.
   */
  onScrollEvent(x: number, y: number): void {
    this.onMouseEvent('scroll', x, y)
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

/**
 * Singleton instance of the ScreenCaptureService.
 *
 * @example
 * ```typescript
 * import { screenCaptureService } from './services/screenCapture'
 *
 * // Start/stop recording
 * screenCaptureService.start()
 * screenCaptureService.stop()
 *
 * // Check status
 * const isRecording = screenCaptureService.isActive()
 *
 * // Listen for status changes
 * screenCaptureService.onStatusChange((recording) => {
 *   updateUI(recording)
 * })
 * ```
 */
export const screenCaptureService = new ScreenCaptureService()
