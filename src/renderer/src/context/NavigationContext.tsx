/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import type { PageType, NavigationState } from '../types'

interface NavigationContextValue {
  currentPage: PageType
  selectedChatId: string | null
  selectedProjectId: number | null
  history: NavigationState['history']
  navigateTo: (page: PageType) => void
  openChat: (chatId: string) => void
  openProject: (projectId: number) => void
  goBack: () => void
  canGoBack: () => boolean
}

const NavigationContext = createContext<NavigationContextValue | undefined>(undefined)

const MAX_HISTORY = 10

interface NavigationProviderProps {
  children: ReactNode
}

export function NavigationProvider({ children }: NavigationProviderProps): React.JSX.Element {
  const [currentPage, setCurrentPage] = useState<PageType>('suggestions')
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
  const [history, setHistory] = useState<NavigationState['history']>([])

  const pushHistory = useCallback(() => {
    const currentState = {
      page: currentPage,
      chatId: selectedChatId || undefined,
      projectId: selectedProjectId || undefined
    }

    setHistory((prev) => {
      const newHistory = [currentState, ...prev].slice(0, MAX_HISTORY)
      return newHistory
    })
  }, [currentPage, selectedChatId, selectedProjectId])

  const navigateTo = useCallback(
    (page: PageType) => {
      if (page !== currentPage || selectedChatId || selectedProjectId) {
        pushHistory()
      }
      setCurrentPage(page)
      setSelectedChatId(null)
      setSelectedProjectId(null)
    },
    [currentPage, selectedChatId, selectedProjectId, pushHistory]
  )

  const openChat = useCallback(
    (chatId: string) => {
      if (chatId !== selectedChatId) {
        pushHistory()
      }
      setSelectedChatId(chatId)
      setSelectedProjectId(null)
    },
    [selectedChatId, pushHistory]
  )

  const openProject = useCallback(
    (projectId: number) => {
      if (projectId !== selectedProjectId) {
        pushHistory()
      }
      setSelectedProjectId(projectId)
      setSelectedChatId(null)
    },
    [selectedProjectId, pushHistory]
  )

  const canGoBack = useCallback(() => {
    return history.length > 0
  }, [history])

  const goBack = useCallback(() => {
    if (history.length === 0) return

    const [previous, ...rest] = history
    setHistory(rest)

    if (previous.chatId) {
      setSelectedChatId(previous.chatId)
      setSelectedProjectId(null)
    } else if (previous.projectId) {
      setSelectedProjectId(previous.projectId)
      setSelectedChatId(null)
    } else if (previous.page) {
      setCurrentPage(previous.page)
      setSelectedChatId(null)
      setSelectedProjectId(null)
    }
  }, [history])

  const value: NavigationContextValue = {
    currentPage,
    selectedChatId,
    selectedProjectId,
    history,
    navigateTo,
    openChat,
    openProject,
    goBack,
    canGoBack
  }

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>
}

export function useNavigation(): NavigationContextValue {
  const context = useContext(NavigationContext)
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider')
  }
  return context
}
