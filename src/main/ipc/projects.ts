/**
 * =============================================================================
 * PROJECT IPC HANDLERS
 * =============================================================================
 *
 * Handles CRUD operations for user projects via IPC.
 *
 * CHANNELS:
 * - projects:getAll    : Get all projects
 * - projects:getActive : Get only active projects
 * - projects:update    : Update project properties
 * - projects:delete    : Delete (soft-delete) a project
 *
 * PROJECT STRUCTURE:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  PROJECT                                                                │
 * │  ┌─────────────────────────────────────────────────────────────────┐   │
 * │  │  projectId: number                                              │   │
 * │  │  title: string                                                  │   │
 * │  │  goal: string                                                   │   │
 * │  │  status: 'active' | 'deleted' | 'open'                          │   │
 * │  │  suggestions: Suggestion[]  (nested)                            │   │
 * │  └─────────────────────────────────────────────────────────────────┘   │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * RELATIONSHIP:
 * - Projects group related suggestions together
 * - Suggestions are assigned to projects when generated
 * - A suggestion's projectId links back to its parent project
 * - When a project is deleted, its suggestions remain but are orphaned
 *
 * @module ipc/projects
 */

import { ipcMain } from 'electron'
import { dataStore } from '../services/dataStore'
import { IPC_CHANNELS, Project } from '../types'

/**
 * Registers project-related IPC handlers.
 */
export function registerProjectHandlers(): void {
  // ---------------------------------------------------------------------------
  // READ Operations
  // ---------------------------------------------------------------------------

  /**
   * Get all projects.
   *
   * Returns all projects regardless of status.
   *
   * @returns Array of all Project objects
   */
  ipcMain.handle(IPC_CHANNELS.PROJECTS_GET_ALL, () => {
    return dataStore.getProjects()
  })

  /**
   * Get active projects only.
   *
   * Returns projects with status 'active' or 'open'.
   * Used for the main project list in the UI.
   *
   * @returns Array of active Project objects
   */
  ipcMain.handle(IPC_CHANNELS.PROJECTS_GET_ACTIVE, () => {
    return dataStore.getActiveProjects()
  })

  // ---------------------------------------------------------------------------
  // WRITE Operations
  // ---------------------------------------------------------------------------

  /**
   * Update a project.
   *
   * Allows updating project properties like title, goal, or status.
   *
   * @param id - Project ID to update
   * @param updates - Partial project object with fields to update
   * @returns Success status
   */
  ipcMain.handle(
    IPC_CHANNELS.PROJECTS_UPDATE,
    (_event, id: number, updates: Partial<Project>) => {
      dataStore.updateProject(id, updates)
      return { success: true }
    }
  )

  /**
   * Delete a project.
   *
   * Performs a soft delete by setting status to 'deleted'.
   * The project is hidden from active views but data is preserved.
   *
   * @param id - Project ID to delete
   * @returns Success status
   */
  ipcMain.handle(IPC_CHANNELS.PROJECTS_DELETE, (_event, id: number) => {
    dataStore.deleteProject(id)
    return { success: true }
  })
}
