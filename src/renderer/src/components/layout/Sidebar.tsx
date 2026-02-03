import React, { useState, useMemo, useEffect } from 'react'
import { SidebarButton } from './SidebarButton'
import { SidebarSection } from './SidebarSection'
import { useAppNavigation } from '../../hooks/useNavigation'
// import { useProjects } from '../../hooks/useProjects'
import { useChat } from '../../hooks/useChat'
import type { PageType } from '../../types'

const NAV_ITEMS: { page: PageType; label: string; icon: React.ReactNode }[] = [
  {
    page: 'suggestions',
    label: 'Suggestions',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
      </svg>
    )
  },
  // {
  //   page: 'projects',
  //   label: 'Projects',
  //   icon: (
  //     <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
  //       <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
  //     </svg>
  //   )
  // },
  {
    page: 'userModel',
    label: 'Memory',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z"
          clipRule="evenodd"
        />
      </svg>
    )
  },
  {
    page: 'customizeAgent',
    label: 'Customize Agent',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" />
      </svg>
    )
  },
  {
    page: 'settings',
    label: 'Settings',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
          clipRule="evenodd"
        />
      </svg>
    )
  }
]

export function Sidebar(): React.JSX.Element {
  const { currentPage, selectedChatId, navigateTo, openChat } = useAppNavigation()
  // const { activeProjects } = useProjects()
  const { recentChats, createNewChat } = useChat()
  const [isRecording, setIsRecording] = useState(false)

  // Sync recording state with backend
  useEffect(() => {
    window.api.recording.getStatus().then(setIsRecording)
    const unsubscribe = window.api.recording.onStatusChange(setIsRecording)
    return unsubscribe
  }, [])

  const handleRecordingToggle = async (): Promise<void> => {
    if (isRecording) {
      await window.api.recording.stop()
    } else {
      await window.api.recording.start()
    }
  }

  const activeIndex = useMemo(() => {
    if (selectedChatId) return -1
    return NAV_ITEMS.findIndex((item) => item.page === currentPage)
  }, [currentPage, selectedChatId])

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        <div className="sidebar-nav-buttons">
          <div
            className="sidebar-nav-indicator"
            style={{
              transform: `translateY(${activeIndex * 40}px)`,
              opacity: activeIndex >= 0 ? 1 : 0
            }}
          />
          {NAV_ITEMS.map((item) => (
            <SidebarButton
              key={item.page}
              icon={item.icon}
              label={item.label}
              active={currentPage === item.page && !selectedChatId}
              onClick={() => navigateTo(item.page)}
            />
          ))}
        </div>

        {/* <SidebarSection title="Active Projects">
          {activeProjects.map((project) => (
            <div
              key={project.projectId}
              className="sidebar-item"
              onClick={() => openProject(project.projectId)}
            >
              <span className="truncate">{project.title}</span>
            </div>
          ))}
          {activeProjects.length === 0 && (
            <div className="sidebar-item" style={{ opacity: 0.5, cursor: 'default' }}>
              No active projects
            </div>
          )}
        </SidebarSection> */}

        <SidebarSection title="Recent Chats">
          {recentChats.map((chat) => (
            <div
              key={chat.id}
              className={`sidebar-item ${selectedChatId === chat.id ? 'active' : ''}`}
              onClick={() => openChat(chat.id)}
            >
              <span className="truncate">{chat.title}</span>
            </div>
          ))}
          {recentChats.length === 0 && (
            <div className="sidebar-item" style={{ opacity: 0.5, cursor: 'default' }}>
              No recent chats
            </div>
          )}
        </SidebarSection>
      </nav>

      <div className="sidebar-footer">
        <button className="sidebar-new-chat-btn" onClick={createNewChat}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 2a1 1 0 011 1v4h4a1 1 0 110 2H9v4a1 1 0 11-2 0V9H3a1 1 0 110-2h4V3a1 1 0 011-1z" />
          </svg>
          New Chat
        </button>
        <button
          className={`sidebar-recording-btn ${isRecording ? 'recording' : ''}`}
          onClick={handleRecordingToggle}
        >
          <span className={`recording-indicator ${isRecording ? 'active' : ''}`} />
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </button>
      </div>
    </aside>
  )
}
