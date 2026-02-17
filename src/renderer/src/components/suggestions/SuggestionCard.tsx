import React, { useState, useEffect } from 'react'
import type { Suggestion } from '../../types'
import { useChat } from '../../hooks/useChat'
import { useSuggestions } from '../../hooks/useSuggestions'
// Unused imports kept for future use when commented code is enabled
// import { useProjects } from '../../hooks/useProjects'
// import { useNavigation } from '../../context/NavigationContext'
// import { SuggestionActions } from './SuggestionActions'
// import { ThumbsUpModal } from '../modals/ThumbsUpModal'
// import { ThumbsDownModal } from '../modals/ThumbsDownModal'

interface SuggestionCardProps {
  suggestion: Suggestion
  showProject?: boolean
}

// Check if suggestion was created within the last 2 seconds
const isNewSuggestion = (createdAt?: number): boolean => {
  if (!createdAt) return false
  return Date.now() - createdAt < 2000
}

export function SuggestionCard({
  suggestion,
  showProject: _showProject = true
}: SuggestionCardProps): React.JSX.Element {
  // _showProject kept for future use when project tags are enabled
  void _showProject

  const { openChatForSuggestion } = useChat()
  const { dismissSuggestion } = useSuggestions()
  const hasExistingChat = suggestion.executionOutput !== ''

  // Track if this card should animate in
  const [isEntering, setIsEntering] = useState(() => isNewSuggestion(suggestion.createdAt))

  // Remove entering class after animation completes
  useEffect(() => {
    if (isEntering) {
      const timer = setTimeout(() => setIsEntering(false), 1500)
      return () => clearTimeout(timer)
    }
  }, [isEntering])

  const handleChatClick = (e: React.MouseEvent): void => {
    e.stopPropagation()
    openChatForSuggestion(suggestion)
  }

  const handleDismiss = (e: React.MouseEvent): void => {
    e.stopPropagation()
    dismissSuggestion(suggestion.suggestionId)
  }

  return (
    <>
      <div className={`suggestion-card${isEntering ? ' entering' : ''}`}>
        <div className="suggestion-card-content">
          <h3 className="suggestion-card-title">{suggestion.title}</h3>
          <p className="suggestion-card-description">{suggestion.description}</p>
        </div>

        <div className="suggestion-card-footer">
          <button className="suggestion-card-chat-btn" onClick={handleChatClick}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <path d="M2 3a1 1 0 011-1h8a1 1 0 011 1v6a1 1 0 01-1 1H6l-3 2V10H3a1 1 0 01-1-1V3z" />
            </svg>
            {hasExistingChat ? 'Open Chat' : 'Start Chat'}
          </button>
          <button className="suggestion-card-remove-btn" onClick={handleDismiss}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <path d="M5.5 1a.5.5 0 00-.5.5V2H2.5a.5.5 0 000 1h.441l.443 8.883A1.5 1.5 0 004.88 13h4.24a1.5 1.5 0 001.496-1.117L11.059 3h.441a.5.5 0 000-1H9v-.5a.5.5 0 00-.5-.5h-3zM5 5.5a.5.5 0 011 0v5a.5.5 0 01-1 0v-5zm3 0a.5.5 0 011 0v5a.5.5 0 01-1 0v-5z" />
            </svg>
            Remove
          </button>
        </div>
      </div>

      {/* {showThumbsUp && (
        <ThumbsUpModal
          suggestion={suggestion}
          onClose={() => setShowThumbsUp(false)}
          onSubmit={() => setShowThumbsUp(false)}
        />
      )}

      {showThumbsDown && (
        <ThumbsDownModal
          suggestion={suggestion}
          onClose={() => setShowThumbsDown(false)}
          onSubmit={() => setShowThumbsDown(false)}
        />
      )} */}
    </>
  )
}
