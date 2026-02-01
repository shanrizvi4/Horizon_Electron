import { useCallback } from 'react'
import { useData } from '../context/DataContext'
import type { Project } from '../types'

interface UseProjectsReturn {
  projects: Project[]
  activeProjects: Project[]
  getProject: (id: number) => Project | undefined
  updateProject: (projectId: number, updates: Partial<Project>) => void
  deleteProject: (projectId: number) => void
  updateProjectTitle: (projectId: number, title: string) => void
  updateProjectGoal: (projectId: number, goal: string) => void
}

export function useProjects(): UseProjectsReturn {
  const { state, dispatch, getProjectById, getActiveProjects, syncToBackend } = useData()

  const updateProject = useCallback(
    (projectId: number, updates: Partial<Project>) => {
      const action = { type: 'UPDATE_PROJECT' as const, payload: { projectId, updates } }
      dispatch(action)
      syncToBackend(action)
    },
    [dispatch, syncToBackend]
  )

  const deleteProject = useCallback(
    (projectId: number) => {
      const action = { type: 'DELETE_PROJECT' as const, payload: { projectId } }
      dispatch(action)
      syncToBackend(action)
    },
    [dispatch, syncToBackend]
  )

  const updateProjectTitle = useCallback(
    (projectId: number, title: string) => {
      const action = { type: 'UPDATE_PROJECT' as const, payload: { projectId, updates: { title } } }
      dispatch(action)
      syncToBackend(action)
    },
    [dispatch, syncToBackend]
  )

  const updateProjectGoal = useCallback(
    (projectId: number, goal: string) => {
      const action = { type: 'UPDATE_PROJECT' as const, payload: { projectId, updates: { goal } } }
      dispatch(action)
      syncToBackend(action)
    },
    [dispatch, syncToBackend]
  )

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
