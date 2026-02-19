/**
 * =============================================================================
 * DATA CONTEXT
 * =============================================================================
 *
 * Central state management for the GUMBO application.
 * Provides a React Context that connects to the Electron main process via IPC.
 *
 * ARCHITECTURE:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  RENDERER PROCESS                                                       │
 * │  ┌─────────────────────────────────────────────────────────────────┐   │
 * │  │  DataProvider                                                   │   │
 * │  │  ┌───────────────────┐                                          │   │
 * │  │  │  useReducer       │ ◄──── Local state for React components   │   │
 * │  │  └───────────────────┘                                          │   │
 * │  │           │                                                     │   │
 * │  │           │ dispatch(action)                                    │   │
 * │  │           ▼                                                     │   │
 * │  │  ┌───────────────────┐     ┌───────────────────────────────┐   │   │
 * │  │  │  dataReducer      │     │  syncToBackend(action)        │   │   │
 * │  │  │  (updates local)  │     │  (syncs to main process)      │   │   │
 * │  │  └───────────────────┘     └───────────────────────────────┘   │   │
 * │  │                                         │                       │   │
 * │  └─────────────────────────────────────────┼───────────────────────┘   │
 * │                                            │                           │
 * │                                    window.api.*.*(...)                 │
 * └────────────────────────────────────────────┼───────────────────────────┘
 *                                              │
 * ┌────────────────────────────────────────────┼───────────────────────────┐
 * │  MAIN PROCESS                              ▼                           │
 * │  ┌─────────────────────────────────────────────────────────────────┐   │
 * │  │  IPC Handlers → DataStore → state.json                          │   │
 * │  └─────────────────────────────────────────────────────────────────┘   │
 * │                              │                                         │
 * │                              │ state:onUpdate events                   │
 * │                              ▼                                         │
 * └──────────────────────────────┼─────────────────────────────────────────┘
 *                                │
 *                    ┌───────────┴───────────┐
 *                    │  DataProvider listens │
 *                    │  dispatch(SET_STATE)  │
 *                    └───────────────────────┘
 *
 * DATA FLOW:
 * 1. On mount: Load initial state from backend via window.api.state.getAll()
 * 2. Subscribe to state updates via window.api.state.subscribe()
 * 3. When user actions occur: dispatch locally + syncToBackend
 * 4. When backend updates: receive via onUpdate → dispatch(SET_STATE)
 *
 * FALLBACK:
 * When running outside Electron (development or web), uses mock data.
 *
 * @module context/DataContext
 */

/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useReducer, useEffect, ReactNode, useRef } from 'react'
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

// =============================================================================
// ENVIRONMENT DETECTION
// =============================================================================

/**
 * Checks if running in Electron with the API bridge available.
 *
 * When running in:
 * - Electron: window.api is exposed by the preload script
 * - Browser/Dev: window.api is undefined, use empty defaults
 *
 * @returns True if Electron API is available
 */
const hasElectronAPI = (): boolean => {
  return (
    typeof window !== 'undefined' && window.api && typeof window.api.state?.getAll === 'function'
  )
}

// =============================================================================
// ACTION TYPES
// =============================================================================

/**
 * All possible actions that can be dispatched to modify state.
 *
 * Each action type corresponds to a specific state mutation.
 * Actions are also synced to the backend via syncToBackend().
 */
type DataAction =
  // State sync
  | { type: 'SET_STATE'; payload: AppState }
  // Suggestions
  | { type: 'UPDATE_SUGGESTION'; payload: { suggestionId: string; updates: Partial<Suggestion> } }
  | { type: 'DISMISS_SUGGESTION'; payload: { suggestionId: string } }
  | { type: 'COMPLETE_SUGGESTION'; payload: { suggestionId: string } }
  // Projects
  | { type: 'UPDATE_PROJECT'; payload: { projectId: number; updates: Partial<Project> } }
  | { type: 'DELETE_PROJECT'; payload: { projectId: number } }
  // Chats
  | { type: 'CREATE_CHAT'; payload: Chat }
  | { type: 'UPDATE_CHAT'; payload: { chatId: string; updates: Partial<Chat> } }
  | { type: 'ADD_MESSAGE'; payload: { chatId: string; message: Message } }
  | {
      type: 'UPDATE_MESSAGE'
      payload: { chatId: string; messageId: string; updates: Partial<Message> }
    }
  // User Model
  | { type: 'ADD_PROPOSITION'; payload: UserProposition }
  | { type: 'UPDATE_PROPOSITION'; payload: { id: string; text: string } }
  | { type: 'DELETE_PROPOSITION'; payload: { id: string } }
  // Settings
  | { type: 'UPDATE_AGENT_CONFIG'; payload: Partial<CustomizeAgentData> }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<AppSettings> }

// =============================================================================
// DEFAULT STATE
// =============================================================================

/**
 * Default state used on first run or when backend is unavailable.
 *
 * Uses empty defaults - all data comes from the backend.
 */
const defaultState: AppState = {
  projects: [],
  suggestions: [],
  chats: [],
  userPropositions: [],
  agentConfig: { focusMoreOn: '', focusLessOn: '', style: '' },
  studyStatus: { status: 'active' },
  settings: {
    notificationFrequency: 5,
    recordingEnabled: false,
    disablePopup: false,
    hasCompletedOnboarding: false
  }
}

// =============================================================================
// REDUCER
// =============================================================================

/**
 * Reducer function for state mutations.
 *
 * Handles all action types and returns a new state object.
 * Follows immutable update patterns.
 *
 * @param state - Current application state
 * @param action - Action to apply
 * @returns New state after applying action
 */
function dataReducer(state: AppState, action: DataAction): AppState {
  switch (action.type) {
    // -------------------------------------------------------------------------
    // STATE SYNC
    // -------------------------------------------------------------------------

    /**
     * Replace entire state (used when receiving updates from backend).
     */
    case 'SET_STATE': {
      return action.payload
    }

    // -------------------------------------------------------------------------
    // SUGGESTIONS
    // -------------------------------------------------------------------------

    /**
     * Update specific fields on a suggestion.
     */
    case 'UPDATE_SUGGESTION': {
      const { suggestionId, updates } = action.payload
      return {
        ...state,
        suggestions: state.suggestions.map((s) =>
          s.suggestionId === suggestionId ? { ...s, ...updates, updatedAt: Date.now() } : s
        )
      }
    }

    /**
     * Dismiss a suggestion (set status to 'closed').
     */
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

    /**
     * Mark a suggestion as complete.
     */
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

    // -------------------------------------------------------------------------
    // PROJECTS
    // -------------------------------------------------------------------------

    /**
     * Update specific fields on a project.
     */
    case 'UPDATE_PROJECT': {
      const { projectId, updates } = action.payload
      return {
        ...state,
        projects: state.projects.map((p) => (p.projectId === projectId ? { ...p, ...updates } : p))
      }
    }

    /**
     * Delete a project (soft delete - also closes its suggestions).
     */
    case 'DELETE_PROJECT': {
      const { projectId } = action.payload
      return {
        ...state,
        projects: state.projects.map((p) =>
          p.projectId === projectId ? { ...p, status: 'deleted' } : p
        ),
        // Also close all suggestions for this project
        suggestions: state.suggestions.map((s) =>
          s.projectId === projectId ? { ...s, status: 'closed', closedAt: Date.now() } : s
        )
      }
    }

    // -------------------------------------------------------------------------
    // CHATS
    // -------------------------------------------------------------------------

    /**
     * Add a new chat to the beginning of the list.
     */
    case 'CREATE_CHAT': {
      return {
        ...state,
        chats: [action.payload, ...state.chats]
      }
    }

    /**
     * Update specific fields on a chat.
     */
    case 'UPDATE_CHAT': {
      const { chatId, updates } = action.payload
      return {
        ...state,
        chats: state.chats.map((c) => (c.id === chatId ? { ...c, ...updates } : c))
      }
    }

    /**
     * Add a message to a chat's message array.
     */
    case 'ADD_MESSAGE': {
      const { chatId, message } = action.payload
      return {
        ...state,
        chats: state.chats.map((c) =>
          c.id === chatId ? { ...c, messages: [...c.messages, message] } : c
        )
      }
    }

    /**
     * Update a specific message within a chat.
     */
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

    // -------------------------------------------------------------------------
    // USER MODEL
    // -------------------------------------------------------------------------

    /**
     * Add a new user proposition.
     */
    case 'ADD_PROPOSITION': {
      return {
        ...state,
        userPropositions: [...state.userPropositions, action.payload]
      }
    }

    /**
     * Update a proposition's text (preserving edit history).
     */
    case 'UPDATE_PROPOSITION': {
      const { id, text } = action.payload
      return {
        ...state,
        userPropositions: state.userPropositions.map((p) =>
          p.id === id ? { ...p, text, editHistory: [...p.editHistory, p.text] } : p
        )
      }
    }

    /**
     * Delete a proposition.
     */
    case 'DELETE_PROPOSITION': {
      const { id } = action.payload
      return {
        ...state,
        userPropositions: state.userPropositions.filter((p) => p.id !== id)
      }
    }

    // -------------------------------------------------------------------------
    // SETTINGS
    // -------------------------------------------------------------------------

    /**
     * Update agent customization config.
     */
    case 'UPDATE_AGENT_CONFIG': {
      return {
        ...state,
        agentConfig: { ...state.agentConfig, ...action.payload }
      }
    }

    /**
     * Update application settings.
     */
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

// =============================================================================
// CONTEXT DEFINITION
// =============================================================================

/**
 * Shape of the DataContext value provided to consumers.
 */
interface DataContextValue {
  /** Current application state */
  state: AppState

  /** Dispatch function for state mutations */
  dispatch: React.Dispatch<DataAction>

  /** True while initial state is being loaded */
  isLoading: boolean

  // ---------------------------------------------------------------------------
  // Helper Functions (for convenience)
  // ---------------------------------------------------------------------------

  /** Find a suggestion by ID */
  getSuggestionById: (id: string) => Suggestion | undefined

  /** Find a project by ID */
  getProjectById: (id: number) => Project | undefined

  /** Find a chat by ID */
  getChatById: (id: string) => Chat | undefined

  /** Get all suggestions for a specific project */
  getProjectSuggestions: (projectId: number) => Suggestion[]

  /** Get only active suggestions */
  getActiveSuggestions: () => Suggestion[]

  /** Get only active projects */
  getActiveProjects: () => Project[]

  /** Get recent chats (sorted by creation date) */
  getRecentChats: (limit?: number) => Chat[]

  // ---------------------------------------------------------------------------
  // Backend Sync
  // ---------------------------------------------------------------------------

  /** Sync an action to the backend (call after dispatch) */
  syncToBackend: (action: DataAction) => Promise<void>
}

const DataContext = createContext<DataContextValue | undefined>(undefined)

// =============================================================================
// PROVIDER COMPONENT
// =============================================================================

interface DataProviderProps {
  children: ReactNode
}

/**
 * DataProvider component that wraps the application.
 *
 * Provides state management and backend synchronization to all child components.
 *
 * USAGE:
 * ```tsx
 * // In App.tsx
 * <DataProvider>
 *   <YourApp />
 * </DataProvider>
 *
 * // In components
 * const { state, dispatch, syncToBackend } = useData()
 * ```
 */
export function DataProvider({ children }: DataProviderProps): React.JSX.Element {
  const [state, dispatch] = useReducer(dataReducer, defaultState)
  const [isLoading, setIsLoading] = React.useState(true)
  const initializedRef = useRef(false)

  // ---------------------------------------------------------------------------
  // Initial State Load & Subscription
  // ---------------------------------------------------------------------------

  useEffect(() => {
    // Prevent double initialization in React Strict Mode
    if (initializedRef.current) return
    initializedRef.current = true

    const loadState = async (): Promise<void> => {
      // Check if we have access to the Electron API
      if (!hasElectronAPI()) {
        console.log('No Electron API available, using mock data')
        setIsLoading(false)
        return
      }

      try {
        // Load initial state from backend
        const backendState = await window.api.state.getAll()

        // Only use backend state if it has actual data
        // (on first run, backend will be empty and we keep mock data)
        const hasData =
          backendState &&
          (backendState.projects.length > 0 ||
            backendState.suggestions.length > 0 ||
            backendState.chats.length > 0 ||
            backendState.userPropositions.length > 0 ||
            backendState.lastUpdateId > 0)

        if (hasData) {
          dispatch({ type: 'SET_STATE', payload: backendState })
        }

        // Subscribe to future state updates from main process
        await window.api.state.subscribe()

        // Listen for state updates (from other windows or backend changes)
        window.api.state.onUpdate((newState: AppState) => {
          dispatch({ type: 'SET_STATE', payload: newState })
        })
      } catch (error) {
        console.error('Failed to load state from backend:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadState()
  }, [])

  // ---------------------------------------------------------------------------
  // Backend Sync Function
  // ---------------------------------------------------------------------------

  /**
   * Syncs an action to the backend.
   *
   * Call this after dispatching an action to persist the change
   * to the main process.
   *
   * @param action - The action that was dispatched
   */
  const syncToBackend = async (action: DataAction): Promise<void> => {
    if (!hasElectronAPI()) return

    try {
      switch (action.type) {
        // Suggestions
        case 'UPDATE_SUGGESTION':
          await window.api.suggestions.update(action.payload.suggestionId, action.payload.updates)
          break
        case 'DISMISS_SUGGESTION':
          await window.api.suggestions.dismiss(action.payload.suggestionId)
          break
        case 'COMPLETE_SUGGESTION':
          await window.api.suggestions.complete(action.payload.suggestionId)
          break

        // Projects
        case 'UPDATE_PROJECT':
          await window.api.projects.update(action.payload.projectId, action.payload.updates)
          break
        case 'DELETE_PROJECT':
          await window.api.projects.delete(action.payload.projectId)
          break

        // Chats
        case 'CREATE_CHAT':
          await window.api.chats.create(action.payload)
          break
        case 'UPDATE_CHAT':
          // Chat updates are handled locally - no separate API needed
          break
        case 'ADD_MESSAGE':
          await window.api.chats.addMessage(action.payload.chatId, action.payload.message)
          break
        case 'UPDATE_MESSAGE':
          await window.api.chats.updateMessage(
            action.payload.chatId,
            action.payload.messageId,
            action.payload.updates
          )
          break

        // User Model
        case 'ADD_PROPOSITION':
          // Already added via userModel.add() in hook
          break
        case 'UPDATE_PROPOSITION':
          await window.api.userModel.update(action.payload.id, action.payload.text)
          break
        case 'DELETE_PROPOSITION':
          await window.api.userModel.delete(action.payload.id)
          break

        // Settings
        case 'UPDATE_AGENT_CONFIG':
          await window.api.agentConfig.update(action.payload)
          break
        case 'UPDATE_SETTINGS':
          await window.api.settings.update(action.payload)
          break
      }
    } catch (error) {
      console.error('Failed to sync to backend:', error)
    }
  }

  // ---------------------------------------------------------------------------
  // Helper Functions
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Context Value
  // ---------------------------------------------------------------------------

  const value: DataContextValue = {
    state,
    dispatch,
    isLoading,
    getSuggestionById,
    getProjectById,
    getChatById,
    getProjectSuggestions,
    getActiveSuggestions,
    getActiveProjects,
    getRecentChats,
    syncToBackend
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

// =============================================================================
// CONSUMER HOOK
// =============================================================================

/**
 * Hook to access the DataContext.
 *
 * Must be used within a DataProvider.
 *
 * @returns DataContext value with state, dispatch, and helpers
 * @throws Error if used outside DataProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { state, getActiveSuggestions, dispatch, syncToBackend } = useData()
 *
 *   const handleDismiss = (id: string) => {
 *     const action = { type: 'DISMISS_SUGGESTION', payload: { suggestionId: id } }
 *     dispatch(action)
 *     syncToBackend(action)
 *   }
 *
 *   return <SuggestionList suggestions={getActiveSuggestions()} onDismiss={handleDismiss} />
 * }
 * ```
 */
export function useData(): DataContextValue {
  const context = useContext(DataContext)
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider')
  }
  return context
}
