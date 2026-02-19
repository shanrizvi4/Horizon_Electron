/**
 * =============================================================================
 * PERMISSIONS SERVICE
 * =============================================================================
 *
 * Manages macOS system permissions required for the GUMBO application.
 *
 * REQUIRED PERMISSIONS:
 * - Screen Recording: Needed to capture screenshots for the AI pipeline
 * - Accessibility: Optional, enables enhanced features
 *
 * PERMISSION CHECKING:
 * - Screen Recording: Checked via desktopCapturer API (returns empty if not granted)
 * - Accessibility: Checked via systemPreferences API
 *
 * @module services/permissionsService
 */

import { systemPreferences, desktopCapturer, shell } from 'electron'

// =============================================================================
// TYPES
// =============================================================================

export type PermissionType = 'ScreenCapture' | 'Accessibility'

export interface PermissionStatus {
  screenRecording: boolean
  accessibility: boolean
}

// =============================================================================
// PERMISSIONS SERVICE CLASS
// =============================================================================

/**
 * Service for checking and requesting macOS system permissions.
 *
 * USAGE:
 * ```typescript
 * import { permissionsService } from './services/permissionsService'
 *
 * // Check screen recording permission
 * const hasPermission = await permissionsService.checkScreenRecordingPermission()
 *
 * // Open System Preferences to grant permission
 * if (!hasPermission) {
 *   await permissionsService.openSystemPreferences('ScreenCapture')
 * }
 * ```
 */
class PermissionsService {
  // ---------------------------------------------------------------------------
  // Screen Recording Permission
  // ---------------------------------------------------------------------------

  /**
   * Checks if screen recording permission is granted.
   *
   * On macOS, we check by attempting to get desktop sources.
   * If the permission is not granted, desktopCapturer returns an empty array
   * or the thumbnails are blank.
   *
   * @returns Promise<boolean> - true if permission is granted
   */
  async checkScreenRecordingPermission(): Promise<boolean> {
    // On non-macOS platforms, assume permission is granted
    if (process.platform !== 'darwin') {
      return true
    }

    try {
      // Try to get screen sources - this triggers the permission check
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1, height: 1 }
      })

      // If we get sources and they have valid thumbnails, permission is granted
      if (sources.length > 0) {
        // Check if the thumbnail is not blank (has actual content)
        const thumbnail = sources[0].thumbnail
        if (thumbnail && !thumbnail.isEmpty()) {
          return true
        }
      }

      return false
    } catch (error) {
      console.error('Error checking screen recording permission:', error)
      return false
    }
  }

  /**
   * Requests screen recording permission by triggering a capture attempt.
   *
   * On macOS Catalina+, this will show the system permission dialog if
   * the app hasn't been granted permission yet.
   *
   * @returns Promise<boolean> - true if permission was granted
   */
  async requestScreenRecordingPermission(): Promise<boolean> {
    if (process.platform !== 'darwin') {
      return true
    }

    try {
      // Attempt to capture - this triggers the permission dialog on macOS
      await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1, height: 1 }
      })

      // Check if permission was granted after the request
      return this.checkScreenRecordingPermission()
    } catch (error) {
      console.error('Error requesting screen recording permission:', error)
      return false
    }
  }

  // ---------------------------------------------------------------------------
  // Accessibility Permission
  // ---------------------------------------------------------------------------

  /**
   * Checks if accessibility permission is granted.
   *
   * Uses the systemPreferences API which provides a direct check on macOS.
   *
   * @returns boolean - true if accessibility permission is granted
   */
  checkAccessibilityPermission(): boolean {
    if (process.platform !== 'darwin') {
      return true
    }

    return systemPreferences.isTrustedAccessibilityClient(false)
  }

  /**
   * Requests accessibility permission by prompting the system dialog.
   *
   * On macOS, this will show the system dialog asking the user to grant
   * accessibility access in System Preferences.
   *
   * @returns boolean - true if permission is granted (user may need to restart app)
   */
  requestAccessibilityPermission(): boolean {
    if (process.platform !== 'darwin') {
      return true
    }

    // Passing true prompts the user to grant access
    return systemPreferences.isTrustedAccessibilityClient(true)
  }

  // ---------------------------------------------------------------------------
  // System Preferences Navigation
  // ---------------------------------------------------------------------------

  /**
   * Opens System Preferences/Settings to the specified privacy pane.
   *
   * This allows users to grant permissions that require manual configuration.
   *
   * @param pane - The privacy pane to open ('ScreenCapture' or 'Accessibility')
   */
  async openSystemPreferences(pane: PermissionType): Promise<void> {
    if (process.platform !== 'darwin') {
      console.warn('openSystemPreferences is only supported on macOS')
      return
    }

    // macOS System Preferences URLs
    // These work on both System Preferences (pre-Ventura) and System Settings (Ventura+)
    const urls: Record<PermissionType, string> = {
      ScreenCapture: 'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture',
      Accessibility: 'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility'
    }

    const url = urls[pane]
    if (url) {
      try {
        await shell.openExternal(url)
      } catch (error) {
        console.error(`Failed to open System Preferences to ${pane}:`, error)
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Combined Status
  // ---------------------------------------------------------------------------

  /**
   * Gets the status of all required permissions.
   *
   * @returns Promise<PermissionStatus> - Status of each permission
   */
  async getAllPermissionStatus(): Promise<PermissionStatus> {
    const [screenRecording, accessibility] = await Promise.all([
      this.checkScreenRecordingPermission(),
      Promise.resolve(this.checkAccessibilityPermission())
    ])

    return {
      screenRecording,
      accessibility
    }
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

/**
 * Singleton instance of the PermissionsService.
 *
 * @example
 * ```typescript
 * import { permissionsService } from './services/permissionsService'
 *
 * const status = await permissionsService.getAllPermissionStatus()
 * console.log('Screen Recording:', status.screenRecording)
 * console.log('Accessibility:', status.accessibility)
 * ```
 */
export const permissionsService = new PermissionsService()
