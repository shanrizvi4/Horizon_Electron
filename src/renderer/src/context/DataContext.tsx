/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useReducer, ReactNode } from 'react'
import type {
  AppState,
  Project,
  Suggestion,
  Chat,
  Message,
  UserProposition,
  CustomizeAgentData,
  AppSettings
} from '../types'
import {
  mockProjects,
  mockSuggestions,
  mockChats,
  mockUserPropositions,
  mockAgentConfig,
  mockStudyStatus,
  mockSettings
} from '../data/mockData'

// Action types
type DataAction =
  | { type: 'UPDATE_SUGGESTION'; payload: { suggestionId: string; updates: Partial<Suggestion> } }
  | { type: 'DISMISS_SUGGESTION'; payload: { suggestionId: string } }
  | { type: 'COMPLETE_SUGGESTION'; payload: { suggestionId: string } }
  | { type: 'UPDATE_PROJECT'; payload: { projectId: number; updates: Partial<Project> } }
  | { type: 'DELETE_PROJECT'; payload: { projectId: number } }
  | { type: 'CREATE_CHAT'; payload: Chat }
  | { type: 'UPDATE_CHAT'; payload: { chatId: string; updates: Partial<Chat> } }
  | { type: 'ADD_MESSAGE'; payload: { chatId: string; message: Message } }
  | {
      type: 'UPDATE_MESSAGE'
      payload: { chatId: string; messageId: string; updates: Partial<Message> }
    }
  | { type: 'ADD_PROPOSITION'; payload: UserProposition }
  | { type: 'UPDATE_PROPOSITION'; payload: { id: string; text: string } }
  | { type: 'DELETE_PROPOSITION'; payload: { id: string } }
  | { type: 'UPDATE_AGENT_CONFIG'; payload: Partial<CustomizeAgentData> }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<AppSettings> }

// Initial state
const initialState: AppState = {
  projects: mockProjects,
  suggestions: mockSuggestions,
  chats: mockChats,
  userPropositions: mockUserPropositions,
  agentConfig: mockAgentConfig,
  studyStatus: mockStudyStatus,
  settings: mockSettings
}

// Reducer
function dataReducer(state: AppState, action: DataAction): AppState {
  switch (action.type) {
    case 'UPDATE_SUGGESTION': {
      const { suggestionId, updates } = action.payload
      return {
        ...state,
        suggestions: state.suggestions.map((s) =>
          s.suggestionId === suggestionId ? { ...s, ...updates, updatedAt: Date.now() } : s
        )
      }
    }

    case 'DISMISS_SUGGESTION': {
      const { suggestionId } = action.payload
      return {
        ...state,
        suggestions: state.suggestions.map((s) =>
          s.suggestionId === suggestionId
            ? { ...s, status: 'closed', closedAt: Date.now(), updatedAt: Date.now() }
            : s
        )
      }
    }

    case 'COMPLETE_SUGGESTION': {
      const { suggestionId } = action.payload
      return {
        ...state,
        suggestions: state.suggestions.map((s) =>
          s.suggestionId === suggestionId
            ? { ...s, status: 'complete', closedAt: Date.now(), updatedAt: Date.now() }
            : s
        )
      }
    }

    case 'UPDATE_PROJECT': {
      const { projectId, updates } = action.payload
      return {
        ...state,
        projects: state.projects.map((p) => (p.projectId === projectId ? { ...p, ...updates } : p))
      }
    }

    case 'DELETE_PROJECT': {
      const { projectId } = action.payload
      return {
        ...state,
        projects: state.projects.map((p) =>
          p.projectId === projectId ? { ...p, status: 'deleted' } : p
        ),
        suggestions: state.suggestions.map((s) =>
          s.projectId === projectId ? { ...s, status: 'closed', closedAt: Date.now() } : s
        )
      }
    }

    case 'CREATE_CHAT': {
      return {
        ...state,
        chats: [action.payload, ...state.chats]
      }
    }

    case 'UPDATE_CHAT': {
      const { chatId, updates } = action.payload
      return {
        ...state,
        chats: state.chats.map((c) => (c.id === chatId ? { ...c, ...updates } : c))
      }
    }

    case 'ADD_MESSAGE': {
      const { chatId, message } = action.payload
      return {
        ...state,
        chats: state.chats.map((c) =>
          c.id === chatId ? { ...c, messages: [...c.messages, message] } : c
        )
      }
    }

    case 'UPDATE_MESSAGE': {
      const { chatId, messageId, updates } = action.payload
      return {
        ...state,
        chats: state.chats.map((c) =>
          c.id === chatId
            ? {
                ...c,
                messages: c.messages.map((m) => (m.id === messageId ? { ...m, ...updates } : m))
              }
            : c
        )
      }
    }

    case 'ADD_PROPOSITION': {
      return {
        ...state,
        userPropositions: [...state.userPropositions, action.payload]
      }
    }

    case 'UPDATE_PROPOSITION': {
      const { id, text } = action.payload
      return {
        ...state,
        userPropositions: state.userPropositions.map((p) =>
          p.id === id ? { ...p, text, editHistory: [...p.editHistory, p.text] } : p
        )
      }
    }

    case 'DELETE_PROPOSITION': {
      const { id } = action.payload
      return {
        ...state,
        userPropositions: state.userPropositions.filter((p) => p.id !== id)
      }
    }

    case 'UPDATE_AGENT_CONFIG': {
      return {
        ...state,
        agentConfig: { ...state.agentConfig, ...action.payload }
      }
    }

    case 'UPDATE_SETTINGS': {
      return {
        ...state,
        settings: { ...state.settings, ...action.payload }
      }
    }

    default:
      return state
  }
}

// Context
interface DataContextValue {
  state: AppState
  dispatch: React.Dispatch<DataAction>
  // Helper functions
  getSuggestionById: (id: string) => Suggestion | undefined
  getProjectById: (id: number) => Project | undefined
  getChatById: (id: string) => Chat | undefined
  getProjectSuggestions: (projectId: number) => Suggestion[]
  getActiveSuggestions: () => Suggestion[]
  getActiveProjects: () => Project[]
  getRecentChats: (limit?: number) => Chat[]
}

const DataContext = createContext<DataContextValue | undefined>(undefined)

// Provider
interface DataProviderProps {
  children: ReactNode
}

export function DataProvider({ children }: DataProviderProps): React.JSX.Element {
  const [state, dispatch] = useReducer(dataReducer, initialState)

  const getSuggestionById = (id: string): Suggestion | undefined => {
    return state.suggestions.find((s) => s.suggestionId === id)
  }

  const getProjectById = (id: number): Project | undefined => {
    return state.projects.find((p) => p.projectId === id)
  }

  const getChatById = (id: string): Chat | undefined => {
    return state.chats.find((c) => c.id === id)
  }

  const getProjectSuggestions = (projectId: number): Suggestion[] => {
    return state.suggestions.filter((s) => s.projectId === projectId)
  }

  const getActiveSuggestions = (): Suggestion[] => {
    return state.suggestions.filter((s) => s.status === 'active')
  }

  const getActiveProjects = (): Project[] => {
    return state.projects.filter((p) => p.status === 'active')
  }

  const getRecentChats = (limit = 5): Chat[] => {
    return [...state.chats].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, limit)
  }

  const value: DataContextValue = {
    state,
    dispatch,
    getSuggestionById,
    getProjectById,
    getChatById,
    getProjectSuggestions,
    getActiveSuggestions,
    getActiveProjects,
    getRecentChats
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

// Hook
export function useData(): DataContextValue {
  const context = useContext(DataContext)
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider')
  }
  return context
}
