import { desktopCapturer, BrowserWindow, screen } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { dataStore } from './dataStore'

class ScreenCaptureService {
  private isRecording = false
  private captureInterval: NodeJS.Timeout | null = null
  private activityDebounceTimeout: NodeJS.Timeout | null = null
  private statusListeners: Set<(isRecording: boolean) => void> = new Set()

  private readonly CAPTURE_INTERVAL_MS = 10000 // 10 seconds (for testing)
  private readonly ACTIVITY_DEBOUNCE_MS = 3000 // 3 seconds after activity

  isActive(): boolean {
    return this.isRecording
  }

  onStatusChange(listener: (isRecording: boolean) => void): () => void {
    this.statusListeners.add(listener)
    return () => this.statusListeners.delete(listener)
  }

  private notifyStatusChange(): void {
    for (const listener of this.statusListeners) {
      try {
        listener(this.isRecording)
      } catch (error) {
        console.error('Error in status change listener:', error)
      }
    }
  }

  start(): void {
    if (this.isRecording) return

    console.log('Starting screen capture service')
    this.isRecording = true
    this.notifyStatusChange()

    // Start periodic captures
    this.captureInterval = setInterval(() => {
      this.captureScreen()
    }, this.CAPTURE_INTERVAL_MS)

    // Capture immediately on start
    this.captureScreen()
  }

  stop(): void {
    if (!this.isRecording) return

    console.log('Stopping screen capture service')
    this.isRecording = false
    this.notifyStatusChange()

    if (this.captureInterval) {
      clearInterval(this.captureInterval)
      this.captureInterval = null
    }

    if (this.activityDebounceTimeout) {
      clearTimeout(this.activityDebounceTimeout)
      this.activityDebounceTimeout = null
    }
  }

  // Call this when activity is detected to trigger a debounced capture
  onActivity(): void {
    if (!this.isRecording) return

    if (this.activityDebounceTimeout) {
      clearTimeout(this.activityDebounceTimeout)
    }

    this.activityDebounceTimeout = setTimeout(() => {
      this.captureScreen()
      this.activityDebounceTimeout = null
    }, this.ACTIVITY_DEBOUNCE_MS)
  }

  private async captureScreen(): Promise<void> {
    // Log focus state but don't skip (for testing)
    const focusedWindow = BrowserWindow.getFocusedWindow()
    console.log(`Attempting capture... (app focused: ${focusedWindow ? 'yes' : 'no'})`)

    try {
      // Get the primary display
      const primaryDisplay = screen.getPrimaryDisplay()
      const { width, height } = primaryDisplay.size

      // Get screen sources
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width, height }
      })

      if (sources.length === 0) {
        console.log('No screen sources available - check Screen Recording permission in System Settings')
        return
      }

      console.log(`Found ${sources.length} screen source(s)`)

      // Use the primary screen (first source)
      const source = sources[0]
      const thumbnail = source.thumbnail

      if (thumbnail.isEmpty()) {
        console.log('Empty thumbnail - Screen Recording permission may be denied')
        return
      }

      // Convert to JPEG and save
      const jpegData = thumbnail.toJPEG(85) // 85% quality
      const timestamp = Date.now()
      const filename = `frame_${timestamp}.jpg`
      const filepath = path.join(dataStore.getScreenshotsDir(), filename)

      await fs.promises.writeFile(filepath, jpegData)
      console.log(`Screenshot saved: ${filename}`)

      // Clean up old screenshots (keep last 100)
      await this.cleanupOldScreenshots()
    } catch (error) {
      console.error('Failed to capture screen:', error)
    }
  }

  private async cleanupOldScreenshots(): Promise<void> {
    try {
      const screenshotsDir = dataStore.getScreenshotsDir()
      const files = await fs.promises.readdir(screenshotsDir)

      // Filter for frame files and sort by name (which includes timestamp)
      const frameFiles = files
        .filter((f) => f.startsWith('frame_') && f.endsWith('.jpg'))
        .sort()

      // Remove oldest files if we have more than 100
      const MAX_SCREENSHOTS = 100
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

  // Get list of recent screenshots
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
}

// Singleton instance
export const screenCaptureService = new ScreenCaptureService()
