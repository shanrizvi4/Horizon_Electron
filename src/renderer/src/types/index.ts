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
  category: 'problem' | 'efficiency' | 'learning'
  initialPrompt: string
  status: 'active' | 'closed' | 'complete'
  keywords: string[]
  approach: string
  executionOutput: string
  executionSummary: { title: string; description: string }
  confidence: number // 0-1 scale - how confident the LLM is
  decayProfile: 'ephemeral' | 'session' | 'durable' | 'evergreen'
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
  importance: number     // 0-10: How much value if valid
  confidence: number     // 0-10: How likely is it correct (highest weight)
  timeliness: number     // 0-10: Is now the right moment
  actionability: number  // 0-10: Can user act immediately
  compositeScore: number // 0.3*importance + 0.4*confidence + 0.2*timeliness + 0.1*actionability
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
