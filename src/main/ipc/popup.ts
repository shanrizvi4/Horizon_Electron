import { ipcMain, BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '../types'
import { mouseTrackerService } from '../services/mouseTracker'

// These will be set by the main process
let showPopupFn: (() => void) | null = null
let hidePopupFn: (() => void) | null = null
let resizePopupFn: ((width: number, height: number) => void) | null = null
let getMainWindowFn: (() => BrowserWindow | null) | null = null
let getPopupWindowFn: (() => BrowserWindow | null) | null = null

export function setPopupFunctions(
  show: () => void,
  hide: () => void,
  resize: (width: number, height: number) => void,
  getMainWindow: () => BrowserWindow | null,
  getPopupWindow: () => BrowserWindow | null
): void {
  showPopupFn = show
  hidePopupFn = hide
  resizePopupFn = resize
  getMainWindowFn = getMainWindow
  getPopupWindowFn = getPopupWindow
}

export function registerPopupHandlers(): void {
  // Show popup window
  ipcMain.handle(IPC_CHANNELS.POPUP_SHOW, () => {
    if (showPopupFn) {
      showPopupFn()
      return { success: true }
    }
    return { success: false, error: 'Popup functions not initialized' }
  })

  // Hide popup window
  ipcMain.handle(IPC_CHANNELS.POPUP_HIDE, () => {
    if (hidePopupFn) {
      hidePopupFn()
      return { success: true }
    }
    return { success: false, error: 'Popup functions not initialized' }
  })

  // Resize popup window (for chat expansion)
  ipcMain.handle(IPC_CHANNELS.POPUP_RESIZE, (_event, width: number, height: number) => {
    if (resizePopupFn) {
      resizePopupFn(width, height)
      return { success: true }
    }
    return { success: false, error: 'Popup functions not initialized' }
  })

  // Open main app window and optionally hide popup
  ipcMain.handle(IPC_CHANNELS.POPUP_OPEN_MAIN_APP, () => {
    if (getMainWindowFn) {
      const mainWindow = getMainWindowFn()
      if (mainWindow) {
        if (mainWindow.isMinimized()) {
          mainWindow.restore()
        }
        mainWindow.show()
        mainWindow.focus()
        return { success: true }
      }
    }
    return { success: false, error: 'Main window not found' }
  })

  // Navigate to a specific chat in the main app
  ipcMain.handle(IPC_CHANNELS.POPUP_NAVIGATE_TO_CHAT, (_event, chatId: string) => {
    if (getMainWindowFn) {
      const mainWindow = getMainWindowFn()
      if (mainWindow) {
        // Send navigation event to main window
        mainWindow.webContents.send('navigate:chat', chatId)
        if (mainWindow.isMinimized()) {
          mainWindow.restore()
        }
        mainWindow.show()
        mainWindow.focus()
        return { success: true }
      }
    }
    return { success: false, error: 'Main window not found' }
  })

  // Temporarily disable auto-close (e.g., when clicking back button)
  ipcMain.handle(IPC_CHANNELS.POPUP_DISABLE_AUTO_CLOSE, (_event, durationMs?: number) => {
    mouseTrackerService.disableAutoCloseTemporarily(durationMs || 2000)
    return { success: true }
  })
}

// Helper to notify popup of visibility changes
export function notifyPopupVisibilityChange(visible: boolean): void {
  const popupWindow = getPopupWindowFn?.()
  if (popupWindow && !popupWindow.isDestroyed()) {
    popupWindow.webContents.send(IPC_CHANNELS.POPUP_VISIBILITY_CHANGE, visible)
  }
}
