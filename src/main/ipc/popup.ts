/**
 * =============================================================================
 * POPUP IPC HANDLERS
 * =============================================================================
 *
 * Handles popup window management via IPC.
 *
 * CHANNELS:
 * - popup:show             : Show the popup window
 * - popup:hide             : Hide the popup window
 * - popup:resize           : Resize popup window dimensions
 * - popup:openMainApp      : Focus/show the main application window
 * - popup:navigateToChat   : Open main app and navigate to specific chat
 * - popup:disableAutoClose : Temporarily disable auto-close behavior
 * - popup:visibilityChange : (event) Notifies popup of visibility changes
 *
 * POPUP ARCHITECTURE:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  POPUP WINDOW                                                           │
 * │  ┌─────────────────────────────────────────────────────────────────┐   │
 * │  │  - Floating window for quick access to suggestions/chats       │   │
 * │  │  - Always-on-top behavior                                       │   │
 * │  │  - Auto-hides when user clicks outside                          │   │
 * │  │  - Can expand for chat view                                     │   │
 * │  └─────────────────────────────────────────────────────────────────┘   │
 * │                                                                         │
 * │  VISIBILITY CONTROL:                                                    │
 * │  ┌─────────────────────────────────────────────────────────────────┐   │
 * │  │  mouseTrackerService                                            │   │
 * │  │    - Monitors mouse position                                    │   │
 * │  │    - Shows popup on tray icon hover                             │   │
 * │  │    - Hides popup when mouse leaves popup area                   │   │
 * │  │    - Respects disableAutoClose for user interactions            │   │
 * │  └─────────────────────────────────────────────────────────────────┘   │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * DEPENDENCY INJECTION:
 * The popup functions (show, hide, resize, etc.) are injected from main/index.ts
 * because the actual BrowserWindow creation happens there. This module just
 * handles the IPC layer.
 *
 * @module ipc/popup
 */

import { ipcMain, BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '../types'
import { mouseTrackerService } from '../services/capture/mouseTracker'

// =============================================================================
// FUNCTION REFERENCES
// =============================================================================

/**
 * These functions are set by the main process during initialization.
 * They provide access to the actual window management functionality.
 */

/** Function to show the popup window */
let showPopupFn: (() => void) | null = null

/** Function to hide the popup window */
let hidePopupFn: (() => void) | null = null

/** Function to resize the popup window */
let resizePopupFn: ((width: number, height: number) => void) | null = null

/** Function to get the main window reference */
let getMainWindowFn: (() => BrowserWindow | null) | null = null

/** Function to get the popup window reference */
let getPopupWindowFn: (() => BrowserWindow | null) | null = null

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Sets the popup control functions.
 *
 * Called by main/index.ts after window creation to provide
 * the actual implementation of popup control operations.
 *
 * @param show - Function to show popup
 * @param hide - Function to hide popup
 * @param resize - Function to resize popup
 * @param getMainWindow - Function to get main window reference
 * @param getPopupWindow - Function to get popup window reference
 */
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

// =============================================================================
// IPC HANDLERS
// =============================================================================

/**
 * Registers popup-related IPC handlers.
 */
export function registerPopupHandlers(): void {
  // ---------------------------------------------------------------------------
  // VISIBILITY CONTROL
  // ---------------------------------------------------------------------------

  /**
   * Show the popup window.
   *
   * Makes the popup visible and brings it to front.
   *
   * @returns Success status
   */
  ipcMain.handle(IPC_CHANNELS.POPUP_SHOW, () => {
    if (showPopupFn) {
      showPopupFn()
      return { success: true }
    }
    return { success: false, error: 'Popup functions not initialized' }
  })

  /**
   * Hide the popup window.
   *
   * Hides the popup from view.
   *
   * @returns Success status
   */
  ipcMain.handle(IPC_CHANNELS.POPUP_HIDE, () => {
    if (hidePopupFn) {
      hidePopupFn()
      return { success: true }
    }
    return { success: false, error: 'Popup functions not initialized' }
  })

  /**
   * Resize the popup window.
   *
   * Used when switching between compact and expanded views
   * (e.g., when opening a chat in the popup).
   *
   * @param width - New width in pixels
   * @param height - New height in pixels
   * @returns Success status
   */
  ipcMain.handle(IPC_CHANNELS.POPUP_RESIZE, (_event, width: number, height: number) => {
    if (resizePopupFn) {
      resizePopupFn(width, height)
      return { success: true }
    }
    return { success: false, error: 'Popup functions not initialized' }
  })

  // ---------------------------------------------------------------------------
  // MAIN WINDOW INTERACTION
  // ---------------------------------------------------------------------------

  /**
   * Open and focus the main application window.
   *
   * Restores the main window if minimized and brings it to front.
   * Used when user wants to switch from popup to full app.
   *
   * @returns Success status
   */
  ipcMain.handle(IPC_CHANNELS.POPUP_OPEN_MAIN_APP, () => {
    if (getMainWindowFn) {
      const mainWindow = getMainWindowFn()
      if (mainWindow) {
        // Restore if minimized
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

  /**
   * Navigate the main app to a specific chat.
   *
   * Opens the main window and sends a navigation event to display
   * the specified chat. Used for "Open in App" functionality.
   *
   * @param chatId - Chat ID to navigate to
   * @returns Success status
   */
  ipcMain.handle(IPC_CHANNELS.POPUP_NAVIGATE_TO_CHAT, (_event, chatId: string) => {
    console.log('[popup:navigateToChat] Called with chatId:', chatId)
    if (getMainWindowFn) {
      const mainWindow = getMainWindowFn()
      console.log('[popup:navigateToChat] Main window found:', !!mainWindow)
      if (mainWindow) {
        // Send navigation event to main window renderer
        console.log('[popup:navigateToChat] Sending navigate:chat event')
        mainWindow.webContents.send('navigate:chat', chatId)

        // Show and focus main window
        if (mainWindow.isMinimized()) {
          mainWindow.restore()
        }
        mainWindow.show()
        mainWindow.focus()
        return { success: true }
      }
    }
    console.log('[popup:navigateToChat] Failed - main window not found')
    return { success: false, error: 'Main window not found' }
  })

  // ---------------------------------------------------------------------------
  // AUTO-CLOSE CONTROL
  // ---------------------------------------------------------------------------

  /**
   * Temporarily disable popup auto-close.
   *
   * When user is interacting with popup controls (like clicking a button),
   * we don't want the popup to auto-hide. This temporarily suspends the
   * auto-close behavior.
   *
   * @param durationMs - How long to disable auto-close (default 2000ms)
   * @returns Success status
   */
  ipcMain.handle(IPC_CHANNELS.POPUP_DISABLE_AUTO_CLOSE, (_event, durationMs?: number) => {
    mouseTrackerService.disableAutoCloseTemporarily(durationMs || 2000)
    return { success: true }
  })
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Notifies the popup window of visibility changes.
 *
 * Called by the mouse tracker service when popup visibility changes.
 * The popup renderer can listen for this event to update its UI state.
 *
 * @param visible - Whether popup is now visible or hidden
 */
export function notifyPopupVisibilityChange(visible: boolean): void {
  const popupWindow = getPopupWindowFn?.()
  if (popupWindow && !popupWindow.isDestroyed()) {
    popupWindow.webContents.send(IPC_CHANNELS.POPUP_VISIBILITY_CHANGE, visible)
  }
}
