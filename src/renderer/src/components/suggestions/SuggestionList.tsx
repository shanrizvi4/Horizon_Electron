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
          <svg width="48" height="48" viewBox="0 0 40 40" fill="currentColor" opacity="0.5">
            <path d="M20 4a16 16 0 100 32 16 16 0 000-32zm0 28a12 12 0 110-24 12 12 0 010 24zm-1-19v8h2v-8h-2zm0 10v2h2v-2h-2z" />
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
