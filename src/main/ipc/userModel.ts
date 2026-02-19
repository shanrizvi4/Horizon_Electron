/**
 * =============================================================================
 * USER MODEL IPC HANDLERS
 * =============================================================================
 *
 * Handles user proposition (memory) management via IPC.
 *
 * CHANNELS:
 * - userModel:getPropositions : Get all user propositions
 * - userModel:add             : Add new proposition
 * - userModel:update          : Update proposition text
 * - userModel:delete          : Delete proposition
 *
 * USER MODEL CONCEPT:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  USER PROPOSITIONS                                                      │
 * │  ┌─────────────────────────────────────────────────────────────────┐   │
 * │  │  User-provided facts and preferences that help personalize      │   │
 * │  │  the AI's suggestions and responses.                            │   │
 * │  │                                                                 │   │
 * │  │  Examples:                                                      │   │
 * │  │  - "I prefer TypeScript over JavaScript"                        │   │
 * │  │  - "I work on a team of 5 engineers"                           │   │
 * │  │  - "Our main product is a mobile banking app"                   │   │
 * │  │  - "I'm learning React Native"                                  │   │
 * │  └─────────────────────────────────────────────────────────────────┘   │
 * │                                                                         │
 * │  USAGE IN AI CONTEXT:                                                   │
 * │  ┌─────────────────────────────────────────────────────────────────┐   │
 * │  │  When generating suggestions or chat responses, propositions    │   │
 * │  │  are included in the system prompt to provide personalization:  │   │
 * │  │                                                                 │   │
 * │  │  "User preferences and context:                                 │   │
 * │  │   - I prefer TypeScript over JavaScript                         │   │
 * │  │   - I work on a team of 5 engineers                            │   │
 * │  │   - ..."                                                        │   │
 * │  └─────────────────────────────────────────────────────────────────┘   │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * @module ipc/userModel
 */

import { ipcMain } from 'electron'
import { dataStore } from '../services/core/dataStore'
import { IPC_CHANNELS, UserProposition } from '../types'

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Generates a unique ID for a new proposition.
 *
 * Format: prop_<timestamp>_<random>
 * Example: prop_1706745600000_abc123def
 *
 * @returns Unique proposition ID
 */
function generateId(): string {
  return `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// =============================================================================
// IPC HANDLERS
// =============================================================================

/**
 * Registers user model IPC handlers.
 */
export function registerUserModelHandlers(): void {
  // ---------------------------------------------------------------------------
  // READ Operations
  // ---------------------------------------------------------------------------

  /**
   * Get all user propositions.
   *
   * Returns the complete list of user-provided facts and preferences.
   *
   * @returns Array of UserProposition objects
   */
  ipcMain.handle(IPC_CHANNELS.USER_MODEL_GET_PROPOSITIONS, () => {
    return dataStore.getPropositions()
  })

  // ---------------------------------------------------------------------------
  // WRITE Operations
  // ---------------------------------------------------------------------------

  /**
   * Add a new proposition.
   *
   * Creates a new user proposition with the provided text.
   * The ID is auto-generated.
   *
   * @param text - The proposition text content
   * @returns The created UserProposition object
   */
  ipcMain.handle(IPC_CHANNELS.USER_MODEL_ADD, (_event, text: string) => {
    const proposition: UserProposition = {
      id: generateId(),
      text,
      editHistory: [] // Track edits for potential undo/history features
    }
    dataStore.addProposition(proposition)
    return proposition
  })

  /**
   * Update a proposition's text.
   *
   * Updates the text content of an existing proposition.
   * The old text is preserved in editHistory.
   *
   * @param id - Proposition ID to update
   * @param text - New text content
   * @returns Success status
   */
  ipcMain.handle(IPC_CHANNELS.USER_MODEL_UPDATE, (_event, id: string, text: string) => {
    dataStore.updateProposition(id, text)
    return { success: true }
  })

  /**
   * Delete a proposition.
   *
   * Permanently removes a proposition from the user model.
   *
   * @param id - Proposition ID to delete
   * @returns Success status
   */
  ipcMain.handle(IPC_CHANNELS.USER_MODEL_DELETE, (_event, id: string) => {
    dataStore.deleteProposition(id)
    return { success: true }
  })
}
