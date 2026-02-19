import React, { useState, useMemo, useCallback } from 'react'
import { PopupSuggestionCard } from './PopupSuggestionCard'
import { useSuggestions } from '../hooks/useSuggestions'
import { useData } from '../context/DataContext'

const TIME_GROUP_ORDER = ['Now', 'Last Hour', 'Today', 'Yesterday', 'This Week', 'Earlier']

export function PopupTray(): React.JSX.Element {
  const [displayCount, setDisplayCount] = useState(10)
  const { isLoading } = useData()
  const { activeSuggestions, sortSuggestions, groupSuggestionsByTime } = useSuggestions()

  // Sort suggestions by recent (default)
  const sortedSuggestions = useMemo(() => {
    return sortSuggestions(activeSuggestions, 'recent')
  }, [activeSuggestions, sortSuggestions])

  // Get displayed suggestions (infinite scroll)
  const displayedSuggestions = useMemo(() => {
    return sortedSuggestions.slice(0, displayCount)
  }, [sortedSuggestions, displayCount])

  // Group by time
  const groupedSuggestions = useMemo(() => {
    return groupSuggestionsByTime(displayedSuggestions)
  }, [displayedSuggestions, groupSuggestionsByTime])

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
        ) : groupedSuggestions ? (
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
                  />
                ))}
              </div>
            )
          })
        ) : null}

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
