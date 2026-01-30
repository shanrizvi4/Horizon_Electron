import React from 'react'
import type { Suggestion, SortMethod } from '../../types'
import { SuggestionCard } from './SuggestionCard'
import { TimeGroupHeader } from '../common/TimeGroupHeader'
import { useSuggestions } from '../../hooks/useSuggestions'

interface SuggestionListProps {
  suggestions: Suggestion[]
  sortMethod: SortMethod
  showProject?: boolean
  emptyMessage?: string
}

export function SuggestionList({
  suggestions,
  sortMethod,
  showProject = true,
  emptyMessage = 'No suggestions found'
}: SuggestionListProps): React.JSX.Element {
  const { groupSuggestionsByTime } = useSuggestions()

  if (suggestions.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="currentColor">
            <path d="M24 4a1 1 0 011 1v1.323l7.908 3.164 3.198-1.6a1 1 0 01.894 1.79l-2.466 1.234 3.476 10.84a1 1 0 01-.57 1.21A7.979 7.979 0 0134 24a7.979 7.979 0 01-5.334-2.036 1 1 0 01-.57-1.21l3.43-10.697L26 7.954V40h4a1 1 0 110 2h-12a1 1 0 110-2h4V7.954l-5.526 2.103 3.43 10.697a1 1 0 01-.57 1.21A7.979 7.979 0 0114 24a7.979 7.979 0 01-5.334-2.036 1 1 0 01-.57-1.21l3.476-10.84-2.466-1.234a1 1 0 01.894-1.79l3.198 1.6L21 6.323V5a1 1 0 011-1z" />
          </svg>
        </div>
        <p className="empty-state-title">{emptyMessage}</p>
        <p className="empty-state-description">
          New suggestions will appear here based on your projects and activity.
        </p>
      </div>
    )
  }

  // If sorting by importance, just render a flat list
  if (sortMethod === 'importance') {
    return (
      <div className="list">
        {suggestions.map((suggestion) => (
          <SuggestionCard
            key={suggestion.suggestionId}
            suggestion={suggestion}
            showProject={showProject}
          />
        ))}
      </div>
    )
  }

  // If sorting by recent, group by time
  const groupedSuggestions = groupSuggestionsByTime(suggestions)
  const groupOrder = ['Now', 'Last Hour', 'Today', 'Yesterday', 'This Week', 'Earlier']

  return (
    <div className="list">
      {groupOrder.map((groupName) => {
        const groupSuggestions = groupedSuggestions.get(groupName)
        if (!groupSuggestions || groupSuggestions.length === 0) return null

        return (
          <React.Fragment key={groupName}>
            <TimeGroupHeader label={groupName} />
            {groupSuggestions.map((suggestion) => (
              <SuggestionCard
                key={suggestion.suggestionId}
                suggestion={suggestion}
                showProject={showProject}
              />
            ))}
          </React.Fragment>
        )
      })}
    </div>
  )
}
