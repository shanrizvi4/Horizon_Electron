import React, { useState } from 'react'

interface PopupHeaderProps {
  onNewChat: () => void
  onOpenInMainApp: () => void
}

export function PopupHeader({
  onNewChat,
  onOpenInMainApp
}: PopupHeaderProps): React.JSX.Element {
  const [newChatHovered, setNewChatHovered] = useState(false)
  const [openAppHovered, setOpenAppHovered] = useState(false)

  return (
    <div className="popup-header">
      {/* Spacer for left side */}
      <div />

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
