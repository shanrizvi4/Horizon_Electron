import React from 'react'

interface SuggestionActionsProps {
  onComplete: () => void
  onDismiss: () => void
  onThumbsUp: () => void
  onThumbsDown: () => void
}

export function SuggestionActions({
  onComplete,
  onDismiss,
  onThumbsUp,
  onThumbsDown
}: SuggestionActionsProps): React.JSX.Element {
  return (
    <>
      <div className="suggestion-card-actions">
        <button
          className="suggestion-card-action-btn complete"
          onClick={(e) => {
            e.stopPropagation()
            onComplete()
          }}
          title="Mark Complete"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"
              clipRule="evenodd"
            />
          </svg>
        </button>
        <button
          className="suggestion-card-action-btn dismiss"
          onClick={(e) => {
            e.stopPropagation()
            onDismiss()
          }}
          title="Dismiss"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4.293 4.293a1 1 0 011.414 0L8 6.586l2.293-2.293a1 1 0 111.414 1.414L9.414 8l2.293 2.293a1 1 0 01-1.414 1.414L8 9.414l-2.293 2.293a1 1 0 01-1.414-1.414L6.586 8 4.293 5.707a1 1 0 010-1.414z" />
          </svg>
        </button>
      </div>
      <div className="suggestion-card-feedback">
        <button
          className="suggestion-card-feedback-btn thumbs-up"
          onClick={(e) => {
            e.stopPropagation()
            onThumbsUp()
          }}
          title="Good suggestion"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
            <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 11-3 0v-6zm4-.167v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
          </svg>
        </button>
        <button
          className="suggestion-card-feedback-btn thumbs-down"
          onClick={(e) => {
            e.stopPropagation()
            onThumbsDown()
          }}
          title="Bad suggestion"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
            <path d="M16 7.5a1.5 1.5 0 10-3 0v-6a1.5 1.5 0 103 0v6zm-4 .167v-5.43a2 2 0 00-1.106-1.79l-.05-.025A4 4 0 009.057 0H3.64a2 2 0 00-1.962 1.608l-1.2 6A2 2 0 002.44 10H6v4a2 2 0 002 2 1 1 0 001-1v-.667a4 4 0 01.8-2.4l1.4-1.866a4 4 0 00.8-2.4z" />
          </svg>
        </button>
      </div>
    </>
  )
}
