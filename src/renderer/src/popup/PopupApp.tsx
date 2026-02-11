import React, { useState, useCallback, useEffect } from 'react'
import { PopupTray } from './PopupTray'
import { PopupChatView } from './PopupChatView'
import type { Chat } from '../types'

type PopupView = 'tray' | 'chat'

// Apply saved theme on popup start
function applyInitialTheme(): void {
  const saved = localStorage.getItem('gumbo-theme')
  if (saved === 'dusk' || saved === 'light' || saved === 'dark') {
    document.documentElement.setAttribute('data-theme', saved)
  }
}

export function PopupApp(): React.JSX.Element {
  const [currentView, setCurrentView] = useState<PopupView>('tray')
  const [activeChat, setActiveChat] = useState<Chat | null>(null)

  // Apply theme on mount and listen for changes
  useEffect(() => {
    applyInitialTheme()

    // Listen for storage changes (when main app changes theme)
    const handleStorageChange = (e: StorageEvent): void => {
      if (e.key === 'gumbo-theme' && e.newValue) {
        document.documentElement.setAttribute('data-theme', e.newValue)
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  // Note: Resize disabled for now - window stays at fixed size

  const handleOpenChat = useCallback((chat: Chat) => {
    setActiveChat(chat)
    setCurrentView('chat')
  }, [])

  const handleBackToTray = useCallback(() => {
    // Disable auto-close briefly when going back
    window.api.popup.disableAutoClose(2000)
    setActiveChat(null)
    setCurrentView('tray')
  }, [])

  const handleOpenChatInMainApp = useCallback((chatId: string) => {
    window.api.popup.navigateToChat(chatId)
  }, [])

  return (
    <div className="popup-container">
      {currentView === 'tray' ? (
        <PopupTray onOpenChat={handleOpenChat} />
      ) : (
        activeChat && (
          <PopupChatView
            chat={activeChat}
            onBack={handleBackToTray}
            onOpenInMainApp={() => handleOpenChatInMainApp(activeChat.id)}
          />
        )
      )}
    </div>
  )
}
