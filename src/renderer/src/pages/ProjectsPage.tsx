import React from 'react'
import { ProjectCard } from '../components/projects/ProjectCard'
import { useProjects } from '../hooks/useProjects'

export function ProjectsPage(): React.JSX.Element {
  const { activeProjects } = useProjects()

  return (
    <div className="content-area">
      <div className="content-header">
        <div className="content-header-left">
          <h1 className="page-title">Projects</h1>
        </div>
      </div>
      <div className="content-body">
        <div className="page page-wide">
          {activeProjects.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="currentColor">
                  <path d="M8 24a4 4 0 014-4h10l4 4h10a4 4 0 014 4v12a4 4 0 01-4 4H12a4 4 0 01-4-4V24z" />
                </svg>
              </div>
              <p className="empty-state-title">No active projects</p>
              <p className="empty-state-description">
                Projects will appear here when they are created.
              </p>
            </div>
          ) : (
            <div className="grid grid-auto">
              {activeProjects.map((project) => (
                <ProjectCard key={project.projectId} project={project} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
