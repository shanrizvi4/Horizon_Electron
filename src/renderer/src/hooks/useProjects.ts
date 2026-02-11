/**
 * =============================================================================
 * USE PROJECTS HOOK
 * =============================================================================
 *
 * Custom React hook for working with user projects.
 * Provides CRUD operations for project management.
 *
 * FEATURES:
 * - Get all projects or active only
 * - Update project properties
 * - Delete projects (soft delete)
 * - Convenience methods for title/goal updates
 *
 * USAGE:
 * ```tsx
 * function ProjectList() {
 *   const { activeProjects, updateProjectTitle, deleteProject } = useProjects()
 *
 *   return (
 *     <ul>
 *       {activeProjects.map(project => (
 *         <li key={project.projectId}>
 *           <EditableTitle
 *             value={project.title}
 *             onChange={(title) => updateProjectTitle(project.projectId, title)}
 *           />
 *           <button onClick={() => deleteProject(project.projectId)}>
 *             Delete
 *           </button>
 *         </li>
 *       ))}
 *     </ul>
 *   )
 * }
 * ```
 *
 * @module hooks/useProjects
 */

import { useCallback } from 'react'
import { useData } from '../context/DataContext'
import type { Project } from '../types'

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Return type of the useProjects hook.
 */
interface UseProjectsReturn {
  /** All projects (including deleted) */
  projects: Project[]

  /** Only active projects */
  activeProjects: Project[]

  /** Find a project by ID */
  getProject: (id: number) => Project | undefined

  /** Update project properties */
  updateProject: (projectId: number, updates: Partial<Project>) => void

  /** Delete a project (soft delete) */
  deleteProject: (projectId: number) => void

  /** Update just the project title */
  updateProjectTitle: (projectId: number, title: string) => void

  /** Update just the project goal */
  updateProjectGoal: (projectId: number, goal: string) => void
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

/**
 * Hook for working with user projects.
 *
 * Projects group related suggestions and help organize work contexts.
 *
 * @returns Project management functions and data
 */
export function useProjects(): UseProjectsReturn {
  const { state, dispatch, getProjectById, getActiveProjects, syncToBackend } = useData()

  // ---------------------------------------------------------------------------
  // CRUD Operations
  // ---------------------------------------------------------------------------

  /**
   * Updates a project's properties.
   *
   * @param projectId - ID of project to update
   * @param updates - Partial project object with fields to update
   */
  const updateProject = useCallback(
    (projectId: number, updates: Partial<Project>) => {
      const action = { type: 'UPDATE_PROJECT' as const, payload: { projectId, updates } }
      dispatch(action)
      syncToBackend(action)
    },
    [dispatch, syncToBackend]
  )

  /**
   * Deletes a project.
   *
   * Performs a soft delete by setting status to 'deleted'.
   * Also closes all suggestions associated with this project.
   *
   * @param projectId - ID of project to delete
   */
  const deleteProject = useCallback(
    (projectId: number) => {
      const action = { type: 'DELETE_PROJECT' as const, payload: { projectId } }
      dispatch(action)
      syncToBackend(action)
    },
    [dispatch, syncToBackend]
  )

  // ---------------------------------------------------------------------------
  // Convenience Methods
  // ---------------------------------------------------------------------------

  /**
   * Updates just the project title.
   *
   * Convenience wrapper around updateProject for common use case.
   *
   * @param projectId - ID of project to update
   * @param title - New title
   */
  const updateProjectTitle = useCallback(
    (projectId: number, title: string) => {
      const action = { type: 'UPDATE_PROJECT' as const, payload: { projectId, updates: { title } } }
      dispatch(action)
      syncToBackend(action)
    },
    [dispatch, syncToBackend]
  )

  /**
   * Updates just the project goal.
   *
   * Convenience wrapper around updateProject for common use case.
   *
   * @param projectId - ID of project to update
   * @param goal - New goal description
   */
  const updateProjectGoal = useCallback(
    (projectId: number, goal: string) => {
      const action = { type: 'UPDATE_PROJECT' as const, payload: { projectId, updates: { goal } } }
      dispatch(action)
      syncToBackend(action)
    },
    [dispatch, syncToBackend]
  )

  // ---------------------------------------------------------------------------
  // Return Value
  // ---------------------------------------------------------------------------

  return {
    projects: state.projects,
    activeProjects: getActiveProjects(),
    getProject: getProjectById,
    updateProject,
    deleteProject,
    updateProjectTitle,
    updateProjectGoal
  }
}
