import React from 'react'
import { useAppNavigation } from '../../hooks/useNavigation'
import { SuggestionsPage } from '../../pages/SuggestionsPage'
import { ProjectsPage } from '../../pages/ProjectsPage'
import { ProjectDetailsPage } from '../../pages/ProjectDetailsPage'
import { ChatPage } from '../../pages/ChatPage'
import { UserModelPage } from '../../pages/UserModelPage'
import { CustomizeAgentPage } from '../../pages/CustomizeAgentPage'
import { SettingsPage } from '../../pages/SettingsPage'

export function ContentArea(): React.JSX.Element {
  const { currentPage, selectedChatId, selectedProjectId } = useAppNavigation()

  // If a chat is selected, show chat page
  if (selectedChatId) {
    return <ChatPage chatId={selectedChatId} />
  }

  // If a project is selected, show project details
  if (selectedProjectId) {
    return <ProjectDetailsPage projectId={selectedProjectId} />
  }

  // Otherwise, show the selected page
  switch (currentPage) {
    case 'suggestions':
      return <SuggestionsPage />
    case 'projects':
      return <ProjectsPage />
    case 'userModel':
      return <UserModelPage />
    case 'customizeAgent':
      return <CustomizeAgentPage />
    case 'settings':
      return <SettingsPage />
    default:
      return <SuggestionsPage />
  }
}
