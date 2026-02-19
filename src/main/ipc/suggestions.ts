/**
 * =============================================================================
 * SUGGESTION IPC HANDLERS
 * =============================================================================
 *
 * Handles CRUD operations for AI-generated suggestions via IPC.
 *
 * CHANNELS:
 * - suggestions:getAll    : Get all suggestions (including dismissed)
 * - suggestions:getActive : Get only active suggestions
 * - suggestions:update    : Update suggestion properties
 * - suggestions:dismiss   : Dismiss (hide) a suggestion
 * - suggestions:complete  : Mark suggestion as complete
 *
 * SUGGESTION LIFECYCLE:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  Pipeline generates suggestion                                          │
 * │         │                                                               │
 * │         ▼                                                               │
 * │  ┌─────────────┐                                                        │
 * │  │   ACTIVE    │ ◄──── Default state when created                      │
 * │  └─────────────┘                                                        │
 * │         │                                                               │
 * │         ├────────────────────┐                                          │
 * │         │                    │                                          │
 * │         ▼                    ▼                                          │
 * │  ┌─────────────┐      ┌─────────────┐                                  │
 * │  │   CLOSED    │      │  COMPLETE   │                                  │
 * │  │ (dismissed) │      │ (finished)  │                                  │
 * │  └─────────────┘      └─────────────┘                                  │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * @module ipc/suggestions
 */

import { ipcMain } from 'electron'
import { dataStore } from '../services/core/dataStore'
import { IPC_CHANNELS, Suggestion } from '../types'

/**
 * Registers suggestion-related IPC handlers.
 */
export function registerSuggestionHandlers(): void {
  // ---------------------------------------------------------------------------
  // READ Operations
  // ---------------------------------------------------------------------------

  /**
   * Get all suggestions.
   *
   * Returns all suggestions regardless of status, including dismissed ones.
   * Used for admin views or when user wants to see history.
   *
   * @returns Array of all Suggestion objects
   */
  ipcMain.handle(IPC_CHANNELS.SUGGESTIONS_GET_ALL, () => {
    return dataStore.getSuggestions()
  })

  /**
   * Get active suggestions only.
   *
   * Returns suggestions with status 'active' - these are the ones
   * that should be displayed in the main UI.
   *
   * @returns Array of active Suggestion objects
   */
  ipcMain.handle(IPC_CHANNELS.SUGGESTIONS_GET_ACTIVE, () => {
    return dataStore.getActiveSuggestions()
  })

  // ---------------------------------------------------------------------------
  // WRITE Operations
  // ---------------------------------------------------------------------------

  /**
   * Update a suggestion.
   *
   * Allows updating any suggestion properties (title, description, etc.).
   * Used when user edits a suggestion or when system updates metadata.
   *
   * @param id - Suggestion ID to update
   * @param updates - Partial suggestion object with fields to update
   * @returns Success status
   */
  ipcMain.handle(
    IPC_CHANNELS.SUGGESTIONS_UPDATE,
    (_event, id: string, updates: Partial<Suggestion>) => {
      dataStore.updateSuggestion(id, updates)
      return { success: true }
    }
  )

  /**
   * Dismiss a suggestion.
   *
   * Sets the suggestion status to 'closed', hiding it from the active list.
   * The suggestion is not deleted and can still be viewed in history.
   *
   * @param id - Suggestion ID to dismiss
   * @returns Success status
   */
  ipcMain.handle(IPC_CHANNELS.SUGGESTIONS_DISMISS, (_event, id: string) => {
    dataStore.dismissSuggestion(id)
    return { success: true }
  })

  /**
   * Complete a suggestion.
   *
   * Sets the suggestion status to 'complete', indicating the user
   * has acted on and finished the suggested task.
   *
   * @param id - Suggestion ID to mark complete
   * @returns Success status
   */
  ipcMain.handle(IPC_CHANNELS.SUGGESTIONS_COMPLETE, (_event, id: string) => {
    dataStore.completeSuggestion(id)
    return { success: true }
  })
}
