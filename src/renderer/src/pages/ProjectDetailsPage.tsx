import React, { useState, useMemo } from 'react'
import type { SortMethod } from '../types'
import { BackButton } from '../components/common/BackButton'
import { SearchBar } from '../components/common/SearchBar'
import { SortToggle } from '../components/common/SortToggle'
import { ProjectHeader } from '../components/projects/ProjectHeader'
import { SuggestionList } from '../components/suggestions/SuggestionList'
import { useProjects } from '../hooks/useProjects'
import { useSuggestions } from '../hooks/useSuggestions'

interface ProjectDetailsPageProps {
  projectId: number
}

export function ProjectDetailsPage({ projectId }: ProjectDetailsPageProps): React.JSX.Element {
  const { getProject } = useProjects()
  const { getProjectSuggestions, sortSuggestions, filterSuggestions } = useSuggestions()
  const [searchQuery, setSearchQuery] = useState('')
  const [sortMethod, setSortMethod] = useState<SortMethod>('recent')

  const project = getProject(projectId)
  const projectSuggestions = getProjectSuggestions(projectId)
  const activeSuggestions = projectSuggestions.filter((s) => s.status === 'active')

  const filteredAndSortedSuggestions = useMemo(() => {
    const filtered = filterSuggestions(activeSuggestions, searchQuery)
    return sortSuggestions(filtered, sortMethod)
  }, [activeSuggestions, searchQuery, sortMethod, filterSuggestions, sortSuggestions])

  if (!project) {
    return (
      <div className="content-area">
        <div className="content-header">
          <div className="content-header-left">
            <BackButton />
          </div>
        </div>
        <div className="content-body">
          <div className="empty-state">
            <p className="empty-state-title">Project not found</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="content-area">
      <div className="content-header">
        <div className="content-header-left">
          <BackButton />
        </div>
      </div>
      <div className="content-body">
        <div className="page">
          <ProjectHeader project={project} />

          <div className="controls-row">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search suggestions..."
            />
            <SortToggle value={sortMethod} onChange={setSortMethod} />
          </div>

          <SuggestionList
            suggestions={filteredAndSortedSuggestions}
            sortMethod={sortMethod}
            showProject={false}
            emptyMessage={
              searchQuery
                ? 'No matching suggestions in this project'
                : 'No active suggestions for this project'
            }
          />
        </div>
      </div>
    </div>
  )
}
