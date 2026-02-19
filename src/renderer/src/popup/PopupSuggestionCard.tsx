import React, { useState, useEffect } from 'react'
import type { Suggestion } from '../types'
import { useData } from '../context/DataContext'
import { useSuggestions } from '../hooks/useSuggestions'
import { useChat } from '../hooks/useChat'

interface PopupSuggestionCardProps {
  suggestion: Suggestion
}

export function PopupSuggestionCard({
  suggestion
}: PopupSuggestionCardProps): React.JSX.Element {
  const { state } = useData()
  const { dismissSuggestion } = useSuggestions()
  const { createChat, addMessage } = useChat()
  const [isHovered, setIsHovered] = useState(false)
  const [hasMouseMoved, setHasMouseMoved] = useState(false)

  // Reset hover state when popup becomes visible
  useEffect(() => {
    const unsubscribe = window.api.popup.onVisibilityChange((visible) => {
      if (visible) {
        setIsHovered(false)
        setHasMouseMoved(false)
      }
    })
    return unsubscribe
  }, [])

  // Check if chat already exists for this suggestion
  const existingChat = state.chats.find(
    (c) => c.associatedSuggestionId === suggestion.suggestionId
  )

  const handleChatClick = (e: React.MouseEvent): void => {
    e.stopPropagation()

    let chatId: string

    if (existingChat) {
      chatId = existingChat.id
    } else {
      // Create new chat
      chatId = createChat({
        title: suggestion.title,
        initialPrompt: suggestion.initialPrompt,
        associatedProjectId: suggestion.projectId,
        associatedSuggestionId: suggestion.suggestionId
      })

      // Add initial chat message if exists (pre-generated intro)
      if (suggestion.initialChatMessage) {
        addMessage(chatId, {
          role: 'assistant',
          content: suggestion.initialChatMessage,
          isPlaceholder: false,
          isError: false
        })
      }
    }

    // Navigate main app to the chat and hide popup
    console.log('[PopupSuggestionCard] Navigating to chat:', chatId)
    window.api.popup.navigateToChat(chatId).then((result) => {
      console.log('[PopupSuggestionCard] navigateToChat result:', result)
    })
    window.api.popup.hide()
  }

  const handleDismiss = (e: React.MouseEvent): void => {
    e.stopPropagation()
    dismissSuggestion(suggestion.suggestionId)
  }

  const handleMouseMove = (): void => {
    if (!hasMouseMoved) {
      setHasMouseMoved(true)
      setIsHovered(true)
    }
  }

  const handleMouseLeave = (): void => {
    setIsHovered(false)
    setHasMouseMoved(false)
  }

  return (
    <div
      className={`popup-suggestion-card ${isHovered ? 'hovered' : ''}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="popup-card-content">
        <h3 className="popup-card-title">{suggestion.title}</h3>
        <p className="popup-card-description">{suggestion.description}</p>
      </div>

      <div className="popup-card-footer">
        <button className="popup-card-chat-btn" onClick={handleChatClick}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
            <path d="M2 3a1 1 0 011-1h8a1 1 0 011 1v6a1 1 0 01-1 1H6l-3 2V10H3a1 1 0 01-1-1V3z" />
          </svg>
          {existingChat ? 'Open Chat' : 'Start Chat'}
        </button>
        <button className="popup-card-remove-btn" onClick={handleDismiss}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
            <path d="M5.5 1a.5.5 0 00-.5.5V2H2.5a.5.5 0 000 1h.441l.443 8.883A1.5 1.5 0 004.88 13h4.24a1.5 1.5 0 001.496-1.117L11.059 3h.441a.5.5 0 000-1H9v-.5a.5.5 0 00-.5-.5h-3zM5 5.5a.5.5 0 011 0v5a.5.5 0 01-1 0v-5zm3 0a.5.5 0 011 0v5a.5.5 0 01-1 0v-5z" />
          </svg>
          Remove
        </button>
      </div>
    </div>
  )
}
