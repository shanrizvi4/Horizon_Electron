import React, { useRef, useEffect, useState } from 'react'
import type { Chat } from '../types'
import { MessageBubble } from '../components/chat/MessageBubble'
import { MessageInput } from '../components/chat/MessageInput'
import { useChat } from '../hooks/useChat'
import { useSuggestions } from '../hooks/useSuggestions'

interface PopupChatViewProps {
  chat: Chat
  onBack: () => void
  onOpenInMainApp: () => void
}

export function PopupChatView({
  chat,
  onBack,
  onOpenInMainApp
}: PopupChatViewProps): React.JSX.Element {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const [backHovered, setBackHovered] = useState(false)
  const [openAppHovered, setOpenAppHovered] = useState(false)
  const { sendMessage, getChat } = useChat()
  const { getSuggestion } = useSuggestions()

  // Get the latest chat state
  const currentChat = getChat(chat.id) || chat

  // Get associated suggestion for execution output
  const suggestion = currentChat.associatedSuggestionId
    ? getSuggestion(currentChat.associatedSuggestionId)
    : undefined

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [currentChat.messages, autoScroll])

  // Detect manual scroll
  const handleScroll = (): void => {
    const container = messagesContainerRef.current
    if (container) {
      const { scrollTop, scrollHeight, clientHeight } = container
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 100
      setAutoScroll(isAtBottom)
    }
  }

  const handleSend = (content: string): void => {
    sendMessage(currentChat.id, content)
    setAutoScroll(true)
  }

  return (
    <div className="popup-chat-container">
      {/* Header */}
      <div className="popup-chat-header">
        <button
          className={`popup-chat-back-btn ${backHovered ? 'hovered' : ''}`}
          onClick={onBack}
          onMouseEnter={() => setBackHovered(true)}
          onMouseLeave={() => setBackHovered(false)}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        </button>

        <h2 className="popup-chat-title">{currentChat.title}</h2>

        <button
          className={`popup-chat-open-app-btn ${openAppHovered ? 'hovered' : ''}`}
          onClick={onOpenInMainApp}
          onMouseEnter={() => setOpenAppHovered(true)}
          onMouseLeave={() => setOpenAppHovered(false)}
          title="Open in App"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M5 4a1 1 0 011-1h4a1 1 0 011 1v1h1a2 2 0 012 2v5a2 2 0 01-2 2H4a2 2 0 01-2-2V7a2 2 0 012-2h1V4z" stroke="currentColor" strokeWidth="1" fill="none" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="popup-chat-messages" ref={messagesContainerRef} onScroll={handleScroll}>
        {/* Show execution output at the top if this is a suggestion chat */}
        {suggestion?.executionOutput && currentChat.messages.length === 0 && (
          <div className="popup-execution-output">
            <div className="popup-execution-header">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M6 12A6 6 0 106 0a6 6 0 000 12zm2.75-7.5a.65.65 0 00-.92-.92L5.25 6.17 4.17 5.08a.65.65 0 00-.92.92l1.5 1.5a.65.65 0 00.92 0l3.08-3z"
                  clipRule="evenodd"
                />
              </svg>
              Execution Output
            </div>
            <div className="popup-execution-content">{suggestion.executionOutput}</div>
          </div>
        )}

        {currentChat.messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {currentChat.messages.length === 0 && !suggestion?.executionOutput && (
          <div className="popup-chat-empty">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="currentColor" opacity="0.5">
              <path d="M6 10a3 3 0 013-3h14a3 3 0 013 3v12a3 3 0 01-3 3H14l-5 4v-4H9a3 3 0 01-3-3V10z" />
            </svg>
            <p>Start the conversation</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="popup-chat-input-container">
        <MessageInput
          onSend={handleSend}
          disabled={currentChat.isLoadingResponse}
          placeholder={currentChat.isLoadingResponse ? 'Waiting for response...' : 'Type a message...'}
        />
      </div>
    </div>
  )
}
