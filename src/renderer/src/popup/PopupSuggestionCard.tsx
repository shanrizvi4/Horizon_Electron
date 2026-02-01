import React, { useState } from 'react'
import type { Suggestion, Chat } from '../types'
import { useData } from '../context/DataContext'
import { useSuggestions } from '../hooks/useSuggestions'
import { useChat } from '../hooks/useChat'

interface PopupSuggestionCardProps {
  suggestion: Suggestion
  onOpenChat: (chat: Chat) => void
}

export function PopupSuggestionCard({
  suggestion,
  onOpenChat
}: PopupSuggestionCardProps): React.JSX.Element {
  const { state } = useData()
  const { dismissSuggestion, completeSuggestion } = useSuggestions()
  const { createChat, addMessage, getChat } = useChat()

  const [isHovered, setIsHovered] = useState(false)
  const [completeHovered, setCompleteHovered] = useState(false)
  const [dismissHovered, setDismissHovered] = useState(false)
  const [chatBtnHovered, setChatBtnHovered] = useState(false)
  const [thumbsUpHovered, setThumbsUpHovered] = useState(false)
  const [thumbsDownHovered, setThumbsDownHovered] = useState(false)

  // Check if chat already exists for this suggestion
  const existingChat = state.chats.find(
    (c) => c.associatedSuggestionId === suggestion.suggestionId
  )

  // Use executionSummary if available, otherwise fall back to title/description
  const displayTitle = suggestion.executionSummary?.title || suggestion.title
  const displayDescription = suggestion.executionSummary?.description || suggestion.description

  const handleChatClick = (): void => {
    if (existingChat) {
      onOpenChat(existingChat)
    } else {
      // Create new chat
      const chatId = createChat({
        title: displayTitle,
        initialPrompt: suggestion.initialPrompt,
        associatedProjectId: suggestion.projectId,
        associatedSuggestionId: suggestion.suggestionId
      })

      // Add initial prompt message if exists
      if (suggestion.initialPrompt) {
        addMessage(chatId, {
          role: 'prompt',
          content: suggestion.initialPrompt,
          isPlaceholder: false,
          isError: false
        })
      }

      // Add execution output if exists
      if (suggestion.executionOutput) {
        addMessage(chatId, {
          role: 'assistant',
          content: suggestion.executionOutput,
          isPlaceholder: false,
          isError: false
        })
      }

      // Get the created chat and open it
      const newChat = getChat(chatId)
      if (newChat) {
        onOpenChat(newChat)
      }
    }
  }

  const handleComplete = (e: React.MouseEvent): void => {
    e.stopPropagation()
    completeSuggestion(suggestion.suggestionId)
  }

  const handleDismiss = (e: React.MouseEvent): void => {
    e.stopPropagation()
    dismissSuggestion(suggestion.suggestionId)
  }

  const handleThumbsUp = (e: React.MouseEvent): void => {
    e.stopPropagation()
    // TODO: Implement thumbs up modal
    console.log('Thumbs up:', suggestion.suggestionId)
  }

  const handleThumbsDown = (e: React.MouseEvent): void => {
    e.stopPropagation()
    // TODO: Implement thumbs down modal
    console.log('Thumbs down:', suggestion.suggestionId)
  }

  return (
    <div
      className={`popup-suggestion-card ${isHovered ? 'hovered' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Top-right action icons */}
      <div className="popup-card-top-actions">
        <button
          className={`popup-card-icon-btn ${completeHovered ? 'complete-hover' : ''}`}
          onClick={handleComplete}
          onMouseEnter={() => setCompleteHovered(true)}
          onMouseLeave={() => setCompleteHovered(false)}
          title="Mark Complete"
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M11 3L5 9 2 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          className={`popup-card-icon-btn ${dismissHovered ? 'dismiss-hover' : ''}`}
          onClick={handleDismiss}
          onMouseEnter={() => setDismissHovered(true)}
          onMouseLeave={() => setDismissHovered(false)}
          title="Dismiss"
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M4 3h5M3 5v6a1 1 0 001 1h5a1 1 0 001-1V5M5 5v5M8 5v5M5.5 3V2a.5.5 0 01.5-.5h1a.5.5 0 01.5.5v1" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <h3 className="popup-card-title">{displayTitle}</h3>
      <p className="popup-card-description">{displayDescription}</p>

      {/* Footer */}
      <div className="popup-card-footer">
        <button
          className={`popup-card-chat-btn ${chatBtnHovered ? 'hovered' : ''}`}
          onClick={handleChatClick}
          onMouseEnter={() => setChatBtnHovered(true)}
          onMouseLeave={() => setChatBtnHovered(false)}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
            <path d="M2 3a1 1 0 011-1h8a1 1 0 011 1v6a1 1 0 01-1 1H6l-3 2V10H3a1 1 0 01-1-1V3z" />
          </svg>
          {existingChat ? 'Open Chat' : 'Start Chat'}
        </button>

        {/* Bottom-right feedback icons */}
        <div className="popup-card-feedback">
          <button
            className={`popup-card-icon-btn ${thumbsUpHovered ? 'thumbs-up-hover' : ''}`}
            onClick={handleThumbsUp}
            onMouseEnter={() => setThumbsUpHovered(true)}
            onMouseLeave={() => setThumbsUpHovered(false)}
            title="Thumbs Up"
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <path d="M4 7v6a1 1 0 001 1h1V7H5a1 1 0 00-1 0zm3 7h5a2 2 0 002-1.5l1-5A2 2 0 0013 5h-3V3a1.5 1.5 0 00-1.5-1.5h-.35a1 1 0 00-.87.5L5 7v7h2z" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            className={`popup-card-icon-btn ${thumbsDownHovered ? 'thumbs-down-hover' : ''}`}
            onClick={handleThumbsDown}
            onMouseEnter={() => setThumbsDownHovered(true)}
            onMouseLeave={() => setThumbsDownHovered(false)}
            title="Thumbs Down"
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <path d="M12 9V3a1 1 0 00-1-1h-1v7h1a1 1 0 001 0zm-3-7H4a2 2 0 00-2 1.5l-1 5A2 2 0 003 11h3v2a1.5 1.5 0 001.5 1.5h.35a1 1 0 00.87-.5L11 9V2H9z" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
