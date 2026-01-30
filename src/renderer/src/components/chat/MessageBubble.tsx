import React, { useState } from 'react'
import type { Message } from '../../types'
import { StreamingIndicator } from './StreamingIndicator'

interface MessageBubbleProps {
  message: Message
  onRetry?: () => void
}

export function MessageBubble({ message, onRetry }: MessageBubbleProps): React.JSX.Element {
  const [copied, setCopied] = useState(false)

  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const bubbleClass = `message-bubble ${message.role} ${message.isError ? 'error' : ''}`

  if (message.isPlaceholder) {
    return (
      <div className={bubbleClass}>
        <StreamingIndicator />
      </div>
    )
  }

  return (
    <div className={bubbleClass}>
      {message.role !== 'user' && (
        <button className="message-bubble-copy" onClick={handleCopy} title="Copy to clipboard">
          {copied ? (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M11.78 3.22a.75.75 0 010 1.06l-6.25 6.25a.75.75 0 01-1.06 0l-2.75-2.75a.75.75 0 011.06-1.06L5 8.94l5.72-5.72a.75.75 0 011.06 0z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <path d="M4.5 1A1.5 1.5 0 003 2.5v8A1.5 1.5 0 004.5 12h5a1.5 1.5 0 001.5-1.5v-8A1.5 1.5 0 009.5 1h-5zM2 2.5A2.5 2.5 0 014.5 0h5A2.5 2.5 0 0112 2.5v8a2.5 2.5 0 01-2.5 2.5h-5A2.5 2.5 0 012 10.5v-8z" />
              <path d="M0 4.5A2.5 2.5 0 012.5 2v1A1.5 1.5 0 001 4.5v8A1.5 1.5 0 002.5 14h5a1.5 1.5 0 001.5-1.5h1a2.5 2.5 0 01-2.5 2.5h-5A2.5 2.5 0 010 12.5v-8z" />
            </svg>
          )}
        </button>
      )}
      <div className="message-bubble-content">{message.content}</div>
      {message.isError && onRetry && (
        <button className="message-bubble-retry" onClick={onRetry}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <path d="M1.5 6a4.5 4.5 0 019 0 4.5 4.5 0 01-9 0zm4.5-3a3 3 0 100 6 3 3 0 000-6z" />
            <path d="M6.5 1a.5.5 0 00-1 0v1.5a.5.5 0 001 0V1z" />
          </svg>
          Retry
        </button>
      )}
    </div>
  )
}
