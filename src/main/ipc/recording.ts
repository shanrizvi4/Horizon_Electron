import { ipcMain, BrowserWindow } from 'electron'
import { screenCaptureService } from '../services/screenCapture'
import { IPC_CHANNELS } from '../types'

export function registerRecordingHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.RECORDING_START, () => {
    screenCaptureService.start()
    return { success: true }
  })

  ipcMain.handle(IPC_CHANNELS.RECORDING_STOP, () => {
    screenCaptureService.stop()
    return { success: true }
  })

  ipcMain.handle(IPC_CHANNELS.RECORDING_GET_STATUS, () => {
    return screenCaptureService.isActive()
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
