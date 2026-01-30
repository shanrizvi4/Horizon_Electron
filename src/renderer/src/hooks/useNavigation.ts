import { useNavigation as useNavigationContext } from '../context/NavigationContext'
import type { PageType } from '../types'

interface UseNavigationReturn {
  currentPage: PageType
  selectedChatId: string | null
  selectedProjectId: number | null
  navigateTo: (page: PageType) => void
  openChat: (chatId: string) => void
  openProject: (projectId: number) => void
  goBack: () => void
  canGoBack: () => boolean
  isOnPage: (page: PageType) => boolean
  isInChat: () => boolean
  isInProject: () => boolean
}

export function useAppNavigation(): UseNavigationReturn {
  const nav = useNavigationContext()

  const isOnPage = (page: PageType): boolean => {
    return nav.currentPage === page && !nav.selectedChatId && !nav.selectedProjectId
  }

  const isInChat = (): boolean => {
    return nav.selectedChatId !== null
  }

  const isInProject = (): boolean => {
    return nav.selectedProjectId !== null && nav.selectedChatId === null
  }

  return {
    ...nav,
    isOnPage,
    isInChat,
    isInProject
  }
}
