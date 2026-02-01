import { ipcMain, BrowserWindow } from 'electron'
import { dataStore } from '../services/dataStore'
import { IPC_CHANNELS, AppState } from '../types'

export function registerStateHandlers(): void {
  // Get full state
  ipcMain.handle(IPC_CHANNELS.STATE_GET_ALL, () => {
    return dataStore.getState()
  })

  // Subscribe to state updates - renderer calls this on mount
  ipcMain.handle(IPC_CHANNELS.STATE_SUBSCRIBE, (event) => {
    const webContents = event.sender

    // Set up listener for state updates
    const unsubscribe = dataStore.onStateUpdate((state: AppState) => {
      if (!webContents.isDestroyed()) {
        webContents.send(IPC_CHANNELS.STATE_ON_UPDATE, state)
      }
    })

    // Clean up when window is closed
    webContents.once('destroyed', () => {
      unsubscribe()
    })

    return { success: true }
  })
}

// Helper to broadcast state updates to all windows
export function broadcastStateUpdate(state: AppState): void {
  const windows = BrowserWindow.getAllWindows()
  for (const window of windows) {
    if (!window.isDestroyed()) {
      window.webContents.send(IPC_CHANNELS.STATE_ON_UPDATE, state)
    }
  }
}
