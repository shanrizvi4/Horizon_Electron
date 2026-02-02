import React, { useState, useCallback } from 'react'
import { PopupTray } from './PopupTray'
import { PopupChatView } from './PopupChatView'
import type { Chat } from '../types'

type PopupView = 'tray' | 'chat'

export function PopupApp(): React.JSX.Element {
  const [currentView, setCurrentView] = useState<PopupView>('tray')
  const [activeChat, setActiveChat] = useState<Chat | null>(null)

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
