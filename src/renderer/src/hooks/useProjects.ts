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
  const { state, dispatch, getProjectById, getActiveProjects } = useData()

  const updateProject = useCallback(
    (projectId: number, updates: Partial<Project>) => {
      dispatch({ type: 'UPDATE_PROJECT', payload: { projectId, updates } })
    },
    [dispatch]
  )

  const deleteProject = useCallback(
    (projectId: number) => {
      dispatch({ type: 'DELETE_PROJECT', payload: { projectId } })
    },
    [dispatch]
  )

  const updateProjectTitle = useCallback(
    (projectId: number, title: string) => {
      dispatch({ type: 'UPDATE_PROJECT', payload: { projectId, updates: { title } } })
    },
    [dispatch]
  )

  const updateProjectGoal = useCallback(
    (projectId: number, goal: string) => {
      dispatch({ type: 'UPDATE_PROJECT', payload: { projectId, updates: { goal } } })
    },
    [dispatch]
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
