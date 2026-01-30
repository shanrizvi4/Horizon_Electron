import React, { useRef, useEffect, useState } from 'react'
import type { Chat } from '../../types'
import { MessageBubble } from './MessageBubble'
import { MessageInput } from './MessageInput'
import { useChat } from '../../hooks/useChat'
import { useSuggestions } from '../../hooks/useSuggestions'

interface ChatViewProps {
  chat: Chat
}

export function ChatView({ chat }: ChatViewProps): React.JSX.Element {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const { sendMessage } = useChat()
  const { getSuggestion } = useSuggestions()

  // Get associated suggestion for execution output
  const suggestion = chat.associatedSuggestionId
    ? getSuggestion(chat.associatedSuggestionId)
    : undefined

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [chat.messages, autoScroll])

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
    sendMessage(chat.id, content)
    setAutoScroll(true)
  }

  return (
    <div className="chat-container">
      <div className="chat-messages" ref={messagesContainerRef} onScroll={handleScroll}>
        {/* Show execution output at the top if this is a suggestion chat */}
        {suggestion?.executionOutput && chat.messages.length === 0 && (
          <div className="execution-output">
            <div className="execution-output-header">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M7 14A7 7 0 107 0a7 7 0 000 14zm3.25-8.75a.75.75 0 00-1.06-1.06L6 7.38 4.81 6.19a.75.75 0 00-1.06 1.06l1.75 1.75a.75.75 0 001.06 0l3.69-3.75z"
                  clipRule="evenodd"
                />
              </svg>
              Execution Output
            </div>
            <div className="execution-output-content">{suggestion.executionOutput}</div>
          </div>
        )}

        {chat.messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {chat.messages.length === 0 && !suggestion?.executionOutput && (
          <div className="empty-state" style={{ flex: 1 }}>
            <div className="empty-state-icon">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="currentColor">
                <path d="M8 12a4 4 0 014-4h24a4 4 0 014 4v20a4 4 0 01-4 4H20l-8 6V36h-4a4 4 0 01-4-4V12z" />
              </svg>
            </div>
            <p className="empty-state-title">Start the conversation</p>
            <p className="empty-state-description">Type a message below to begin chatting.</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <MessageInput
        onSend={handleSend}
        disabled={chat.isLoadingResponse}
        placeholder={chat.isLoadingResponse ? 'Waiting for response...' : 'Type a message...'}
      />
    </div>
  )
}
