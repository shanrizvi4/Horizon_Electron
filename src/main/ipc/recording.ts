import { ipcMain, BrowserWindow } from 'electron'
import { screenCaptureService } from '../services/screenCapture'
import { pipelineService } from '../services/pipelineService'
import { frameAnalysisService } from '../services/frameAnalysisService'
import { dataStore } from '../services/dataStore'
import { IPC_CHANNELS } from '../types'

export function registerRecordingHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.RECORDING_START, () => {
    screenCaptureService.start()
    pipelineService.start()
    // Update settings to reflect recording state
    dataStore.updateSettings({ recordingEnabled: true })
    return { success: true }
  })

  ipcMain.handle(IPC_CHANNELS.RECORDING_STOP, () => {
    screenCaptureService.stop()
    pipelineService.stop()
    // Update settings to reflect recording state
    dataStore.updateSettings({ recordingEnabled: false })
    return { success: true }
  })

  ipcMain.handle(IPC_CHANNELS.RECORDING_GET_STATUS, () => {
    return screenCaptureService.isActive()
  })

  // Single frame LLM test - tests the Gemini vision API with one screenshot
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
        return { success: false, error: 'No screenshot found or API key missing' }
      }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // Set up status change notifications
  screenCaptureService.onStatusChange((isRecording: boolean) => {
    const windows = BrowserWindow.getAllWindows()
    for (const window of windows) {
      if (!window.isDestroyed()) {
        window.webContents.send(IPC_CHANNELS.RECORDING_STATUS_CHANGE, isRecording)
      }
    }
  })
}
