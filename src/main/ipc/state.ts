/**
 * =============================================================================
 * STATE IPC HANDLERS
 * =============================================================================
 *
 * Handles state synchronization between main process and renderer windows.
 * Enables multi-window support where all windows stay in sync.
 *
 * CHANNELS:
 * - state:getAll    : Get complete application state
 * - state:subscribe : Register for state update notifications
 * - state:onUpdate  : (event) Broadcasts state changes to subscribed windows
 *
 * MULTI-WINDOW SYNC ARCHITECTURE:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  Window 1 (Main App)                                                    │
 * │  ┌─────────────────────────────────────────────────────────────────┐   │
 * │  │  DataContext                                                    │   │
 * │  │    - Calls state:subscribe on mount                             │   │
 * │  │    - Receives state:onUpdate events                             │   │
 * │  │    - Updates local state → UI re-renders                        │   │
 * │  └─────────────────────────────────────────────────────────────────┘   │
 * └─────────────────────────────────────────────────────────────────────────┘
 *                                      ▲
 *                                      │ state:onUpdate events
 *                                      │
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  MAIN PROCESS                                                           │
 * │  ┌─────────────────────────────────────────────────────────────────┐   │
 * │  │  dataStore.onStateUpdate() ─────────────────────────────────────┼───┤
 * │  │    - Listens for any state change                               │   │
 * │  │    - Broadcasts to ALL subscribed windows                       │   │
 * │  └─────────────────────────────────────────────────────────────────┘   │
 * └─────────────────────────────────────────────────────────────────────────┘
 *                                      │ state:onUpdate events
 *                                      ▼
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  Window 2 (Popup)                                                       │
 * │  ┌─────────────────────────────────────────────────────────────────┐   │
 * │  │  PopupDataContext                                               │   │
 * │  │    - Also subscribed to state:onUpdate                          │   │
 * │  │    - Stays in sync with main window                             │   │
 * │  └─────────────────────────────────────────────────────────────────┘   │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * @module ipc/state
 */

import { ipcMain, BrowserWindow } from 'electron'
import { dataStore } from '../services/dataStore'
import { IPC_CHANNELS, AppState } from '../types'

/**
 * Registers state-related IPC handlers.
 */
export function registerStateHandlers(): void {
  // ---------------------------------------------------------------------------
  // STATE ACCESS
  // ---------------------------------------------------------------------------

  /**
   * Get complete application state.
   * Called by renderer on initial load to populate DataContext.
   *
   * @returns Complete AppState object
   */
  ipcMain.handle(IPC_CHANNELS.STATE_GET_ALL, () => {
    return dataStore.getState()
  })

  // ---------------------------------------------------------------------------
  // STATE SUBSCRIPTION
  // ---------------------------------------------------------------------------

  /**
   * Subscribe to state updates.
   *
   * When called, sets up a listener that will send 'state:onUpdate' events
   * to this window whenever the dataStore state changes.
   *
   * The subscription is automatically cleaned up when the window is destroyed.
   *
   * USAGE (in renderer):
   * ```typescript
   * // On mount
   * await api.state.subscribe()
   *
   * // Listen for updates
   * api.state.onUpdate((newState) => {
   *   dispatch({ type: 'SET_STATE', payload: newState })
   * })
   * ```
   */
  ipcMain.handle(IPC_CHANNELS.STATE_SUBSCRIBE, (event) => {
    const webContents = event.sender

    // Set up listener that forwards state updates to this window
    const unsubscribe = dataStore.onStateUpdate((state: AppState) => {
      // Safety check: don't send to destroyed windows
      if (!webContents.isDestroyed()) {
        webContents.send(IPC_CHANNELS.STATE_ON_UPDATE, state)
      }
    })

    // Automatic cleanup when window closes
    webContents.once('destroyed', () => {
      unsubscribe()
    })

    return { success: true }
  })
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Broadcasts a state update to all open windows.
 *
 * Use this when you need to manually trigger a sync, though normally
 * the dataStore.onStateUpdate listener handles this automatically.
 *
 * @param state - The state to broadcast
 */
export function broadcastStateUpdate(state: AppState): void {
  const windows = BrowserWindow.getAllWindows()

  for (const window of windows) {
    if (!window.isDestroyed()) {
      window.webContents.send(IPC_CHANNELS.STATE_ON_UPDATE, state)
    }
  }
}
