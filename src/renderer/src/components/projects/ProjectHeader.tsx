import React, { useState } from 'react'
import type { Project } from '../../types'
import { useProjects } from '../../hooks/useProjects'
import { useNavigation } from '../../context/NavigationContext'
import { EditTitleModal } from '../modals/EditTitleModal'
import { EditGoalModal } from '../modals/EditGoalModal'
import { Modal } from '../modals/Modal'

interface ProjectHeaderProps {
  project: Project
}

export function ProjectHeader({ project }: ProjectHeaderProps): React.JSX.Element {
  const { updateProjectTitle, updateProjectGoal, deleteProject } = useProjects()
  const { navigateTo } = useNavigation()
  const [showEditTitle, setShowEditTitle] = useState(false)
  const [showEditGoal, setShowEditGoal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleDelete = (): void => {
    deleteProject(project.projectId)
    navigateTo('projects')
  }

  return (
    <>
      <div className="project-details-header">
        <h1 className="project-details-title" onClick={() => setShowEditTitle(true)}>
          {project.title}
        </h1>
        <p className="project-details-goal" onClick={() => setShowEditGoal(true)}>
          {project.goal}
        </p>
      </div>

      {showEditTitle && (
        <EditTitleModal
          currentTitle={project.title}
          onClose={() => setShowEditTitle(false)}
          onSave={(newTitle) => {
            updateProjectTitle(project.projectId, newTitle)
            setShowEditTitle(false)
          }}
        />
      )}

      {showEditGoal && (
        <EditGoalModal
          currentGoal={project.goal}
          onClose={() => setShowEditGoal(false)}
          onSave={(newGoal) => {
            updateProjectGoal(project.projectId, newGoal)
            setShowEditGoal(false)
          }}
        />
      )}

      {showDeleteConfirm && (
        <Modal title="Delete Project" onClose={() => setShowDeleteConfirm(false)} size="sm">
          <div className="delete-warning">
            <span className="delete-warning-icon">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
            <span className="delete-warning-text">
              This will permanently delete the project and close all associated suggestions.
            </span>
          </div>
          <div className="modal-footer" style={{ borderTop: 'none', padding: 0 }}>
            <button className="btn btn-secondary" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </button>
            <button className="btn btn-danger" onClick={handleDelete}>
              Delete Project
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}
