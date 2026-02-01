import React, { useState, useMemo, useCallback } from 'react'
import { PopupHeader } from './PopupHeader'
import { PopupSuggestionCard } from './PopupSuggestionCard'
import { useSuggestions } from '../hooks/useSuggestions'
import { useChat } from '../hooks/useChat'
import { useData } from '../context/DataContext'
import type { Chat, SortMethod } from '../types'

interface PopupTrayProps {
  onOpenChat: (chat: Chat) => void
  onOpenInMainApp: () => void
}

const TIME_GROUP_ORDER = ['Now', 'Last Hour', 'Today', 'Yesterday', 'This Week', 'Earlier']

export function PopupTray({ onOpenChat, onOpenInMainApp }: PopupTrayProps): React.JSX.Element {
  const [sortMethod, setSortMethod] = useState<SortMethod>('recent')
  const [displayCount, setDisplayCount] = useState(10)
  const { isLoading } = useData()
  const { activeSuggestions, sortSuggestions, groupSuggestionsByTime } = useSuggestions()
  const { createChat, getChat } = useChat()

  // Sort suggestions
  const sortedSuggestions = useMemo(() => {
    return sortSuggestions(activeSuggestions, sortMethod)
  }, [activeSuggestions, sortSuggestions, sortMethod])

  // Get displayed suggestions (infinite scroll)
  const displayedSuggestions = useMemo(() => {
    return sortedSuggestions.slice(0, displayCount)
  }, [sortedSuggestions, displayCount])

  // Group by time if sorting by recent
  const groupedSuggestions = useMemo(() => {
    if (sortMethod !== 'recent') return null
    return groupSuggestionsByTime(displayedSuggestions)
  }, [displayedSuggestions, groupSuggestionsByTime, sortMethod])

  const handleSortChange = useCallback((method: SortMethod) => {
    setSortMethod(method)
    setDisplayCount(10) // Reset count when changing sort
  }, [])

  const handleNewChat = useCallback(() => {
    const chatId = createChat({ title: 'New Chat' })
    const chat = getChat(chatId)
    if (chat) {
      onOpenChat(chat)
    }
  }, [createChat, getChat, onOpenChat])

  const handleLoadMore = useCallback(() => {
    if (displayCount < sortedSuggestions.length) {
      setDisplayCount((prev) => prev + 10)
    }
  }, [displayCount, sortedSuggestions.length])

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.target as HTMLDivElement
      const { scrollTop, scrollHeight, clientHeight } = target
      // Load more when scrolled near the bottom
      if (scrollHeight - scrollTop - clientHeight < 100) {
        handleLoadMore()
      }
    },
    [handleLoadMore]
  )

  return (
    <div className="popup-tray">
      {/* Draggable indicator */}
      <div className="popup-drag-handle">
        <div className="popup-drag-indicator" />
      </div>

      <PopupHeader
        sortMethod={sortMethod}
        onSortChange={handleSortChange}
        onNewChat={handleNewChat}
        onOpenInMainApp={onOpenInMainApp}
      />

      <div className="popup-suggestions-scroll" onScroll={handleScroll}>
        {isLoading ? (
          <div className="popup-empty-state">
            <p>Loading...</p>
          </div>
        ) : activeSuggestions.length === 0 ? (
          <div className="popup-empty-state">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="currentColor" opacity="0.5">
              <path d="M20 4a16 16 0 100 32 16 16 0 000-32zm0 28a12 12 0 110-24 12 12 0 010 24zm-1-19v8h2v-8h-2zm0 10v2h2v-2h-2z" />
            </svg>
            <p>No active suggestions</p>
            <span>New suggestions will appear here</span>
          </div>
        ) : sortMethod === 'recent' && groupedSuggestions ? (
          // Render grouped by time
          TIME_GROUP_ORDER.map((groupName) => {
            const groupSuggestions = groupedSuggestions.get(groupName)
            if (!groupSuggestions || groupSuggestions.length === 0) return null

            return (
              <div key={groupName} className="popup-time-group">
                <div className="popup-time-header">{groupName}</div>
                {groupSuggestions.map((suggestion) => (
                  <PopupSuggestionCard
                    key={suggestion.suggestionId}
                    suggestion={suggestion}
                    onOpenChat={onOpenChat}
                  />
                ))}
              </div>
            )
          })
        ) : (
          // Render flat list (importance sort)
          displayedSuggestions.map((suggestion) => (
            <PopupSuggestionCard
              key={suggestion.suggestionId}
              suggestion={suggestion}
              onOpenChat={onOpenChat}
            />
          ))
        )}

        {/* Infinite scroll trigger */}
        {displayCount < sortedSuggestions.length && (
          <div className="popup-load-more" />
        )}
      </div>

      {/* Recording button at bottom */}
      <div className="popup-recording-container">
        <RecordingButton />
      </div>
    </div>
  )
}

function RecordingButton(): React.JSX.Element {
  const [isRecording, setIsRecording] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  // Get initial recording status
  React.useEffect(() => {
    window.api.recording.getStatus().then(setIsRecording)
    const unsubscribe = window.api.recording.onStatusChange(setIsRecording)
    return unsubscribe
  }, [])

  const handleToggle = async (): Promise<void> => {
    if (isRecording) {
      await window.api.recording.stop()
    } else {
      await window.api.recording.start()
    }
  }

  return (
    <button
      className={`popup-recording-btn ${isRecording ? 'recording' : ''} ${isHovered ? 'hovered' : ''}`}
      onClick={handleToggle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`popup-recording-dot ${isRecording ? 'active' : ''}`} />
      {isRecording ? 'Stop Recording' : 'Start Recording'}
    </button>
  )
}
