/// <reference types="vite/client" />

// Types matching the backend types
interface Project {
  projectId: number
  title: string
  goal: string
  status: 'active' | 'deleted' | 'open'
  suggestions: Suggestion[]
  createdAt?: number
  closedAt?: number
}

interface Suggestion {
  suggestionId: string
  projectId: number
  title: string
  description: string
  initialPrompt: string
  status: 'active' | 'closed' | 'complete'
  keywords: string[]
  approach: string
  executionOutput: string
  executionSummary: { title: string; description: string }
  support: number
  utilities: Utilities
  grounding: string[]
  initialChatMessage?: string
  createdAt?: number
  updatedAt?: number
  closedAt?: number
}

interface Utilities {
  taskNumber: number
  benefit: number
  falsePositiveCost: number
  falseNegativeCost: number
  decay: number
}

interface Chat {
  id: string
  title: string
  messages: Message[]
  hasReceivedInitialResponse: boolean
  isLoadingResponse: boolean
  initialPrompt?: string
  associatedProjectId?: number
  associatedSuggestionId?: string
  createdAt?: number
  closedAt?: number
  status: string
}

interface Message {
  id: string
  role: 'user' | 'assistant' | 'prompt'
  content: string
  isPlaceholder: boolean
  isError: boolean
}

interface UserProposition {
  id: string
  text: string
  editHistory: string[]
}

interface CustomizeAgentData {
  focusMoreOn: string
  focusLessOn: string
  style: string
}

interface AppSettings {
  notificationFrequency: number
  recordingEnabled: boolean
  disablePopup: boolean
  hasCompletedOnboarding?: boolean
  onboardingCompletedAt?: number
}

interface PermissionStatus {
  screenRecording: boolean
  accessibility: boolean
}

interface StudyStatus {
  status: string
  endTime?: number
}

interface AppState {
  projects: Project[]
  suggestions: Suggestion[]
  chats: Chat[]
  userPropositions: UserProposition[]
  agentConfig: CustomizeAgentData
  studyStatus: StudyStatus
  settings: AppSettings
  lastUpdateId: number
  lastProcessedTimestamp: number
}

interface GumboAPI {
  suggestions: {
    getAll: () => Promise<Suggestion[]>
    getActive: () => Promise<Suggestion[]>
    update: (id: string, data: Partial<Suggestion>) => Promise<{ success: boolean }>
    dismiss: (id: string) => Promise<{ success: boolean }>
    complete: (id: string) => Promise<{ success: boolean }>
  }

  projects: {
    getAll: () => Promise<Project[]>
    getActive: () => Promise<Project[]>
    update: (id: number, data: Partial<Project>) => Promise<{ success: boolean }>
    delete: (id: number) => Promise<{ success: boolean }>
  }

  chats: {
    getAll: () => Promise<Chat[]>
    get: (id: string) => Promise<Chat | undefined>
    create: (data: Chat) => Promise<Chat>
    addMessage: (chatId: string, message: Message) => Promise<Message>
    updateMessage: (
      chatId: string,
      messageId: string,
      updates: Partial<Message>
    ) => Promise<{ success: boolean }>
    sendMessage: (chatId: string, content: string) => Promise<{ success: boolean }>
    onStreamChunk: (
      callback: (data: { chatId: string; chunk: string }) => void
    ) => () => void
  }

  userModel: {
    getPropositions: () => Promise<UserProposition[]>
    add: (text: string) => Promise<UserProposition>
    update: (id: string, text: string) => Promise<{ success: boolean }>
    delete: (id: string) => Promise<{ success: boolean }>
  }

  agentConfig: {
    get: () => Promise<CustomizeAgentData>
    update: (data: Partial<CustomizeAgentData>) => Promise<{ success: boolean }>
  }

  settings: {
    get: () => Promise<AppSettings>
    update: (data: Partial<AppSettings>) => Promise<{ success: boolean }>
  }

  recording: {
    start: () => Promise<{ success: boolean }>
    stop: () => Promise<{ success: boolean }>
    getStatus: () => Promise<boolean>
    onStatusChange: (callback: (isRecording: boolean) => void) => () => void
  }

  state: {
    getAll: () => Promise<AppState>
    subscribe: () => Promise<{ success: boolean }>
    onUpdate: (callback: (state: AppState) => void) => () => void
  }

  popup: {
    show: () => Promise<{ success: boolean }>
    hide: () => Promise<{ success: boolean }>
    resize: (width: number, height: number) => Promise<{ success: boolean }>
    openMainApp: () => Promise<{ success: boolean }>
    navigateToChat: (chatId: string) => Promise<{ success: boolean }>
    disableAutoClose: (durationMs?: number) => Promise<{ success: boolean }>
    onVisibilityChange: (callback: (visible: boolean) => void) => () => void
    onNavigateToChat: (callback: (chatId: string) => void) => () => void
  }

  permissions: {
    checkScreenRecording: () => Promise<boolean>
    requestScreenRecording: () => Promise<boolean>
    checkAccessibility: () => Promise<boolean>
    requestAccessibility: () => Promise<boolean>
    openPreferences: (pane: 'ScreenCapture' | 'Accessibility') => Promise<{ success: boolean }>
    getAll: () => Promise<PermissionStatus>
  }
}

declare global {
  interface Window {
    api: GumboAPI
  }
}

export {}
