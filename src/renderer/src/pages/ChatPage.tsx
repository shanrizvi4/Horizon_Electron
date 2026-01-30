import React from 'react'
import { BackButton } from '../components/common/BackButton'
import { ChatView } from '../components/chat/ChatView'
import { useChat } from '../hooks/useChat'
import { useProjects } from '../hooks/useProjects'
import { useNavigation } from '../context/NavigationContext'

interface ChatPageProps {
  chatId: string
}

export function ChatPage({ chatId }: ChatPageProps): React.JSX.Element {
  const { getChat } = useChat()
  const { getProject } = useProjects()
  const { openProject } = useNavigation()

  const chat = getChat(chatId)

  if (!chat) {
    return (
      <div className="content-area">
        <div className="content-header">
          <div className="content-header-left">
            <BackButton />
          </div>
        </div>
        <div className="content-body">
          <div className="empty-state">
            <p className="empty-state-title">Chat not found</p>
          </div>
        </div>
      </div>
    )
  }

  const associatedProject = chat.associatedProjectId ? getProject(chat.associatedProjectId) : null

  return (
    <div className="content-area">
      <div className="chat-header">
        <div className="chat-header-left">
          <BackButton />
          <h1 className="chat-header-title">{chat.title}</h1>
        </div>
      </div>
      <ChatView chat={chat} />
    </div>
  )
}
