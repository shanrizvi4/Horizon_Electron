// TypeScript interfaces for Horizon Electron app

export interface Project {
  projectId: number
  title: string
  goal: string
  status: 'active' | 'deleted' | 'open'
  suggestions: Suggestion[]
  createdAt?: number
  closedAt?: number
}

export interface Suggestion {
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

export interface Utilities {
  taskNumber: number
  benefit: number
  falsePositiveCost: number
  falseNegativeCost: number
  decay: number
}

export interface Chat {
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

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'prompt'
  content: string
  isPlaceholder: boolean
  isError: boolean
}

export interface UserProposition {
  id: string
  text: string
  editHistory: string[]
}

export interface CustomizeAgentData {
  focusMoreOn: string
  focusLessOn: string
  style: string
}

export interface StudyStatus {
  status: string
  endTime?: number
}

export type PageType = 'suggestions' | 'projects' | 'userModel' | 'customizeAgent' | 'settings' | 'evaluation'
export type SortMethod = 'recent' | 'importance'

export interface NavigationState {
  selectedPage: PageType
  selectedChatId: string | null
  selectedProjectId: number | null
  history: Array<{
    page?: PageType
    chatId?: string
    projectId?: number
  }>
}

export interface AppState {
  projects: Project[]
  suggestions: Suggestion[]
  chats: Chat[]
  userPropositions: UserProposition[]
  agentConfig: CustomizeAgentData
  studyStatus: StudyStatus
  settings: AppSettings
}

export interface AppSettings {
  notificationFrequency: number
  recordingEnabled: boolean
  disablePopup: boolean
  hasCompletedOnboarding?: boolean
  onboardingCompletedAt?: number
}

export interface PermissionStatus {
  screenRecording: boolean
  accessibility: boolean
}
