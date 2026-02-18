import React from 'react'

interface SuggestionSummary {
  suggestionId: string
  title: string
  status: string
  support: number
  createdAt: number
  sourceFrameCount: number
}

interface EvalSuggestionListProps {
  suggestions: SuggestionSummary[]
  selectedSuggestionId: string | null
  onSuggestionSelect: (suggestionId: string) => void
}

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'active':
      return 'eval-badge-active'
    case 'complete':
      return 'eval-badge-complete'
    case 'closed':
      return 'eval-badge-closed'
    default:
      return 'eval-badge-generated'
  }
}

export function EvalSuggestionList({
  suggestions,
  selectedSuggestionId,
  onSuggestionSelect
}: EvalSuggestionListProps): React.JSX.Element {
  if (suggestions.length === 0) {
    return (
      <div className="eval-empty-list">
        <p>No suggestions found</p>
        <p className="eval-empty-hint">Suggestions are generated from analyzed frames</p>
      </div>
    )
  }

  return (
    <div className="eval-list">
      {suggestions.map((suggestion) => (
        <div
          key={suggestion.suggestionId}
          className={`eval-list-item ${selectedSuggestionId === suggestion.suggestionId ? 'selected' : ''}`}
          onClick={() => onSuggestionSelect(suggestion.suggestionId)}
        >
          <div className="eval-list-item-main">
            <div className="eval-list-item-content">
              <div className="eval-list-item-title">{suggestion.title}</div>
              <div className="eval-list-item-id">{suggestion.suggestionId}</div>
              <div className="eval-list-item-time">{formatTimestamp(suggestion.createdAt)}</div>
            </div>
          </div>
          <div className="eval-list-item-badges">
            <span className={`eval-badge ${getStatusColor(suggestion.status)}`}>
              {suggestion.status}
            </span>
            <span className="eval-badge eval-badge-score" title="Support score">
              {(suggestion.support * 100).toFixed(0)}%
            </span>
            <span
              className="eval-badge eval-badge-frames"
              title={`${suggestion.sourceFrameCount} source frame(s)`}
            >
              {suggestion.sourceFrameCount}F
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
