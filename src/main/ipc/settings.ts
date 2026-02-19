/**
 * =============================================================================
 * SETTINGS IPC HANDLERS
 * =============================================================================
 *
 * Handles application settings and agent configuration via IPC.
 *
 * CHANNELS:
 * - settings:get       : Get application settings
 * - settings:update    : Update application settings
 * - agentConfig:get    : Get agent customization config
 * - agentConfig:update : Update agent customization
 *
 * SETTINGS STRUCTURE:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  APP SETTINGS                                                           │
 * │  ┌─────────────────────────────────────────────────────────────────┐   │
 * │  │  notificationFrequency: number                                  │   │
 * │  │    - How often to show notifications (minutes)                  │   │
 * │  │                                                                 │   │
 * │  │  recordingEnabled: boolean                                      │   │
 * │  │    - Whether screen capture is active                           │   │
 * │  │                                                                 │   │
 * │  │  disablePopup: boolean                                          │   │
 * │  │    - Whether to show the floating popup window                  │   │
 * │  └─────────────────────────────────────────────────────────────────┘   │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * AGENT CONFIG STRUCTURE:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  AGENT CUSTOMIZATION                                                    │
 * │  ┌─────────────────────────────────────────────────────────────────┐   │
 * │  │  focusMoreOn: string                                            │   │
 * │  │    - Topics to emphasize (e.g., "code quality, testing")        │   │
 * │  │                                                                 │   │
 * │  │  focusLessOn: string                                            │   │
 * │  │    - Topics to de-emphasize (e.g., "documentation")            │   │
 * │  │                                                                 │   │
 * │  │  style: string                                                  │   │
 * │  │    - Communication style (e.g., "concise", "detailed")          │   │
 * │  └─────────────────────────────────────────────────────────────────┘   │
 * │                                                                         │
 * │  USAGE IN AI CONTEXT:                                                   │
 * │  ┌─────────────────────────────────────────────────────────────────┐   │
 * │  │  Agent config is included in LLM prompts to customize behavior: │   │
 * │  │                                                                 │   │
 * │  │  "Agent customization:                                          │   │
 * │  │   Focus more on: code quality, testing                          │   │
 * │  │   Focus less on: documentation                                  │   │
 * │  │   Communication style: concise"                                 │   │
 * │  └─────────────────────────────────────────────────────────────────┘   │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * @module ipc/settings
 */

import { ipcMain } from 'electron'
import { dataStore } from '../services/core/dataStore'
import { IPC_CHANNELS, AppSettings, CustomizeAgentData } from '../types'

/**
 * Registers settings-related IPC handlers.
 */
export function registerSettingsHandlers(): void {
  // ---------------------------------------------------------------------------
  // APP SETTINGS
  // ---------------------------------------------------------------------------

  /**
   * Get application settings.
   *
   * Returns the current application settings including notification
   * frequency, recording state, and popup preferences.
   *
   * @returns AppSettings object
   */
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, () => {
    return dataStore.getSettings()
  })

  /**
   * Update application settings.
   *
   * Merges the provided updates with existing settings.
   * Only the specified fields are changed.
   *
   * @param updates - Partial settings object with fields to update
   * @returns Success status
   */
  ipcMain.handle(IPC_CHANNELS.SETTINGS_UPDATE, (_event, updates: Partial<AppSettings>) => {
    dataStore.updateSettings(updates)
    return { success: true }
  })

  // ---------------------------------------------------------------------------
  // AGENT CONFIGURATION
  // ---------------------------------------------------------------------------

  /**
   * Get agent customization configuration.
   *
   * Returns the current AI agent customization settings that
   * control how suggestions and responses are generated.
   *
   * @returns CustomizeAgentData object
   */
  ipcMain.handle(IPC_CHANNELS.AGENT_CONFIG_GET, () => {
    return dataStore.getAgentConfig()
  })

  /**
   * Update agent customization configuration.
   *
   * Merges the provided updates with existing agent config.
   * Changes take effect on the next AI generation.
   *
   * @param updates - Partial agent config with fields to update
   * @returns Success status
   */
  ipcMain.handle(
    IPC_CHANNELS.AGENT_CONFIG_UPDATE,
    (_event, updates: Partial<CustomizeAgentData>) => {
      dataStore.updateAgentConfig(updates)
      return { success: true }
    }
  )
}
