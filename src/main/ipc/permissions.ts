/**
 * =============================================================================
 * PERMISSIONS IPC HANDLERS
 * =============================================================================
 *
 * IPC handlers for macOS permission checking and requesting.
 *
 * CHANNELS:
 * - permissions:checkScreenRecording - Check screen recording permission status
 * - permissions:requestScreenRecording - Request screen recording permission
 * - permissions:checkAccessibility - Check accessibility permission status
 * - permissions:requestAccessibility - Request accessibility permission
 * - permissions:openPreferences - Open System Preferences to permission pane
 * - permissions:getAll - Get status of all permissions
 *
 * @module ipc/permissions
 */

import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../types'
import { permissionsService, PermissionType } from '../services/permissionsService'

/**
 * Registers all permission-related IPC handlers.
 *
 * Called during app initialization from registerAllIpcHandlers().
 */
export function registerPermissionsHandlers(): void {
  // ---------------------------------------------------------------------------
  // Screen Recording
  // ---------------------------------------------------------------------------

  /**
   * Check if screen recording permission is granted.
   * @returns Promise<boolean>
   */
  ipcMain.handle(IPC_CHANNELS.PERMISSIONS_CHECK_SCREEN_RECORDING, async () => {
    return permissionsService.checkScreenRecordingPermission()
  })

  /**
   * Request screen recording permission.
   * This triggers the system permission dialog on macOS.
   * @returns Promise<boolean> - true if permission was granted
   */
  ipcMain.handle(IPC_CHANNELS.PERMISSIONS_REQUEST_SCREEN_RECORDING, async () => {
    return permissionsService.requestScreenRecordingPermission()
  })

  // ---------------------------------------------------------------------------
  // Accessibility
  // ---------------------------------------------------------------------------

  /**
   * Check if accessibility permission is granted.
   * @returns boolean
   */
  ipcMain.handle(IPC_CHANNELS.PERMISSIONS_CHECK_ACCESSIBILITY, () => {
    return permissionsService.checkAccessibilityPermission()
  })

  /**
   * Request accessibility permission.
   * This shows the system dialog prompting the user.
   * @returns boolean - current permission status
   */
  ipcMain.handle(IPC_CHANNELS.PERMISSIONS_REQUEST_ACCESSIBILITY, () => {
    return permissionsService.requestAccessibilityPermission()
  })

  // ---------------------------------------------------------------------------
  // System Preferences Navigation
  // ---------------------------------------------------------------------------

  /**
   * Open System Preferences to a specific privacy pane.
   * @param pane - 'ScreenCapture' or 'Accessibility'
   */
  ipcMain.handle(
    IPC_CHANNELS.PERMISSIONS_OPEN_PREFERENCES,
    async (_event, pane: PermissionType) => {
      await permissionsService.openSystemPreferences(pane)
      return { success: true }
    }
  )

  // ---------------------------------------------------------------------------
  // Combined Status
  // ---------------------------------------------------------------------------

  /**
   * Get status of all permissions at once.
   * @returns Promise<{ screenRecording: boolean, accessibility: boolean }>
   */
  ipcMain.handle(IPC_CHANNELS.PERMISSIONS_GET_ALL, async () => {
    return permissionsService.getAllPermissionStatus()
  })

  console.log('Permissions IPC handlers registered')
}
