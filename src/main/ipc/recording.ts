/**
 * =============================================================================
 * RECORDING IPC HANDLERS
 * =============================================================================
 *
 * Handles screen capture and recording control via IPC.
 *
 * CHANNELS:
 * - recording:start        : Start screen capture
 * - recording:stop         : Stop screen capture
 * - recording:getStatus    : Get current recording state
 * - recording:testLLM      : Test LLM analysis on a single screenshot
 * - recording:statusChange : (event) Broadcasts recording state changes
 *
 * RECORDING SYSTEM COMPONENTS:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  screenCaptureService                                                   │
 * │  ┌─────────────────────────────────────────────────────────────────┐   │
 * │  │  - Captures screenshots based on mouse activity                 │   │
 * │  │  - 3-second debounce (before/after frames)                      │   │
 * │  │  - 30-second periodic captures                                  │   │
 * │  │  - Skips when app is focused (privacy)                          │   │
 * │  └─────────────────────────────────────────────────────────────────┘   │
 * └─────────────────────────────────────────────────────────────────────────┘
 *                                      │
 *                                      ▼
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  pipelineService                                                        │
 * │  ┌─────────────────────────────────────────────────────────────────┐   │
 * │  │  - Watches screenshots folder                                   │   │
 * │  │  - Processes new screenshots through 5-step pipeline:           │   │
 * │  │    1. Frame Analysis (transcription)                            │   │
 * │  │    2. Retrieval (find similar past observations)                │   │
 * │  │    3. Suggestion Generation                                     │   │
 * │  │    4. Scoring & Filtering                                       │   │
 * │  │    5. Deduplication                                             │   │
 * │  └─────────────────────────────────────────────────────────────────┘   │
 * └─────────────────────────────────────────────────────────────────────────┘
 *                                      │
 *                                      ▼
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  dataStore                                                              │
 * │  ┌─────────────────────────────────────────────────────────────────┐   │
 * │  │  - Stores generated suggestions                                 │   │
 * │  │  - Persists to state.json                                       │   │
 * │  │  - Notifies renderer via state:onUpdate                         │   │
 * │  └─────────────────────────────────────────────────────────────────┘   │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * @module ipc/recording
 */

import { ipcMain, BrowserWindow } from 'electron'
import { screenCaptureService } from '../services/screenCapture'
import { pipelineService } from '../services/pipelineService'
import { frameAnalysisService } from '../services/frameAnalysisService'
import { fakeSuggestionService } from '../services/fakeSuggestionService'
import { dataStore } from '../services/dataStore'
import { IPC_CHANNELS } from '../types'

// Use fake suggestions for development (set to false for real LLM pipeline)
const USE_FAKE_SUGGESTIONS = true

/**
 * Registers recording-related IPC handlers.
 */
export function registerRecordingHandlers(): void {
  // ---------------------------------------------------------------------------
  // RECORDING CONTROL
  // ---------------------------------------------------------------------------

  /**
   * Start screen capture and pipeline processing.
   *
   * Starts both:
   * - screenCaptureService: Captures screenshots based on activity
   * - pipelineService: Processes screenshots to generate suggestions
   *
   * Also updates settings to persist recording state across restarts.
   */
  ipcMain.handle(IPC_CHANNELS.RECORDING_START, () => {
    if (USE_FAKE_SUGGESTIONS) {
      // Use fake suggestions for development
      fakeSuggestionService.start()
    } else {
      // Start capture service (screenshots)
      screenCaptureService.start()

      // Start pipeline service (LLM processing)
      pipelineService.start()
    }

    // Persist recording state to settings
    dataStore.updateSettings({ recordingEnabled: true })

    return { success: true }
  })

  /**
   * Stop screen capture and pipeline processing.
   */
  ipcMain.handle(IPC_CHANNELS.RECORDING_STOP, () => {
    if (USE_FAKE_SUGGESTIONS) {
      fakeSuggestionService.stop()
    } else {
      // Stop both services
      screenCaptureService.stop()
      pipelineService.stop()
    }

    // Persist recording state
    dataStore.updateSettings({ recordingEnabled: false })

    return { success: true }
  })

  /**
   * Get current recording status.
   *
   * @returns Boolean indicating if recording is active
   */
  ipcMain.handle(IPC_CHANNELS.RECORDING_GET_STATUS, () => {
    return screenCaptureService.isActive()
  })

  // ---------------------------------------------------------------------------
  // LLM TESTING
  // ---------------------------------------------------------------------------

  /**
   * Test LLM analysis on a single screenshot.
   *
   * Used for debugging/testing the vision API without full pipeline.
   * Analyzes the most recent screenshot and returns the transcription.
   *
   * @returns Analysis result or error
   */
  ipcMain.handle(IPC_CHANNELS.RECORDING_TEST_LLM, async () => {
    try {
      const result = await frameAnalysisService.testSingleFrameWithLLM()

      if (result) {
        return {
          success: true,
          analysis: result.analysis,
          frameId: result.frameId,
          usedLLM: result.usedLLM
        }
      } else {
        return {
          success: false,
          error: 'No screenshot found or API key missing'
        }
      }
    } catch (error) {
      return {
        success: false,
        error: String(error)
      }
    }
  })

  // ---------------------------------------------------------------------------
  // STATUS CHANGE NOTIFICATIONS
  // ---------------------------------------------------------------------------

  /**
   * Set up automatic status change broadcasting.
   *
   * When recording starts/stops, all windows receive a notification
   * so they can update their UI accordingly.
   */
  screenCaptureService.onStatusChange((isRecording: boolean) => {
    // Broadcast to all windows
    const windows = BrowserWindow.getAllWindows()

    for (const window of windows) {
      if (!window.isDestroyed()) {
        window.webContents.send(IPC_CHANNELS.RECORDING_STATUS_CHANGE, isRecording)
      }
    }
  })
}
