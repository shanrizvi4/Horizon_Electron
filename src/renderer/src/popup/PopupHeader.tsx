import React, { useState, useRef, useEffect } from 'react'
import type { SortMethod } from '../types'

interface PopupHeaderProps {
  sortMethod: SortMethod
  onSortChange: (method: SortMethod) => void
  onNewChat: () => void
  onOpenInMainApp: () => void
}

export function PopupHeader({
  sortMethod,
  onSortChange,
  onNewChat,
  onOpenInMainApp
}: PopupHeaderProps): React.JSX.Element {
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [sortHovered, setSortHovered] = useState(false)
  const [newChatHovered, setNewChatHovered] = useState(false)
  const [openAppHovered, setOpenAppHovered] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowSortMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="popup-header">
      {/* Sort dropdown */}
      <div className="popup-sort-container" ref={menuRef}>
        <button
          className={`popup-sort-btn ${sortHovered ? 'hovered' : ''}`}
          onClick={() => setShowSortMenu(!showSortMenu)}
          onMouseEnter={() => setSortHovered(true)}
          onMouseLeave={() => setSortHovered(false)}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
            <path d="M2 4h10M4 7h6M6 10h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          </svg>
          <span>Sort</span>
        </button>

        {showSortMenu && (
          <div className="popup-sort-menu">
            <button
              className={`popup-sort-option ${sortMethod === 'recent' ? 'active' : ''}`}
              onClick={() => {
                onSortChange('recent')
                setShowSortMenu(false)
              }}
            >
              {sortMethod === 'recent' && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                  <path d="M10 3L4.5 8.5 2 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
              )}
              Most Recent
            </button>
            <button
              className={`popup-sort-option ${sortMethod === 'importance' ? 'active' : ''}`}
              onClick={() => {
                onSortChange('importance')
                setShowSortMenu(false)
              }}
            >
              {sortMethod === 'importance' && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                  <path d="M10 3L4.5 8.5 2 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
              )}
              Most Important
            </button>
          </div>
        )}
      </div>

      {/* Right side buttons */}
      <div className="popup-header-actions">
        {/* New Chat button */}
        <button
          className={`popup-icon-btn ${newChatHovered ? 'hovered' : ''}`}
          onClick={onNewChat}
          onMouseEnter={() => setNewChatHovered(true)}
          onMouseLeave={() => setNewChatHovered(false)}
          title="New Chat"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
            <path d="M9 2a7 7 0 017 7 7 7 0 01-7 7 7 7 0 01-7-7 7 7 0 017-7zm0 3a.75.75 0 00-.75.75v2.5h-2.5a.75.75 0 000 1.5h2.5v2.5a.75.75 0 001.5 0v-2.5h2.5a.75.75 0 000-1.5h-2.5v-2.5A.75.75 0 009 5z" />
          </svg>
        </button>

        {/* Open in App button */}
        <button
          className={`popup-icon-btn ${openAppHovered ? 'hovered' : ''}`}
          onClick={onOpenInMainApp}
          onMouseEnter={() => setOpenAppHovered(true)}
          onMouseLeave={() => setOpenAppHovered(false)}
          title="Open App"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
            <path d="M5 4a1 1 0 011-1h6a1 1 0 011 1v1h1a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V7a2 2 0 012-2h1V4zm1 2v7h8V7H6V6z" />
          </svg>
        </button>
      </div>
    </div>
  )
}
