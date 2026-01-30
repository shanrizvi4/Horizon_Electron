import React from 'react'
import type { Project } from '../../types'
import { useSuggestions } from '../../hooks/useSuggestions'
import { useNavigation } from '../../context/NavigationContext'

interface ProjectCardProps {
  project: Project
}

function formatDate(timestamp?: number): string {
  if (!timestamp) return ''
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

export function ProjectCard({ project }: ProjectCardProps): React.JSX.Element {
  const { getProjectSuggestions } = useSuggestions()
  const { openProject } = useNavigation()

  const suggestions = getProjectSuggestions(project.projectId)
  const activeSuggestions = suggestions.filter((s) => s.status === 'active')

  return (
    <div className="project-card" onClick={() => openProject(project.projectId)}>
      <h3 className="project-card-title">{project.title}</h3>
      <p className="project-card-goal">{project.goal}</p>
      <div className="project-card-footer">
        <div className="project-card-meta">
          <span className="project-card-suggestions-count">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <path d="M7 1a1 1 0 011 1v.807l2.954 1.182 1.192-.596a1 1 0 01.894 1.79l-.92.46 1.297 4.048a1 1 0 01-.426 1.122A2.989 2.989 0 0111 11.5a2.989 2.989 0 01-2-.687 1 1 0 01-.426-1.122L9.86 5.727 8 4.983V12h1.5a1 1 0 110 2h-5a1 1 0 110-2H6V4.983l-1.86.744 1.287 4.014a1 1 0 01-.426 1.122A2.989 2.989 0 013 11.5a2.989 2.989 0 01-2-.687 1 1 0 01-.426-1.122l1.297-4.048-.92-.46a1 1 0 01.894-1.79l1.192.596L6 2.807V2a1 1 0 011-1z" />
            </svg>
            {activeSuggestions.length} active
          </span>
          <span>{formatDate(project.createdAt)}</span>
        </div>
        <button
          className="project-card-open-btn"
          onClick={(e) => {
            e.stopPropagation()
            openProject(project.projectId)
          }}
        >
          Open
        </button>
      </div>
    </div>
  )
}
