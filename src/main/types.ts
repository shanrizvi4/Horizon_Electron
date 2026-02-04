// TypeScript interfaces for main process - mirrors renderer types

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

export interface AppSettings {
  notificationFrequency: number
  recordingEnabled: boolean
  disablePopup: boolean
}

export interface AppState {
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

// IPC Channel names
export const IPC_CHANNELS = {
  // Suggestions
  SUGGESTIONS_GET_ALL: 'suggestions:getAll',
  SUGGESTIONS_GET_ACTIVE: 'suggestions:getActive',
  SUGGESTIONS_UPDATE: 'suggestions:update',
  SUGGESTIONS_DISMISS: 'suggestions:dismiss',
  SUGGESTIONS_COMPLETE: 'suggestions:complete',

  // Projects
  PROJECTS_GET_ALL: 'projects:getAll',
  PROJECTS_GET_ACTIVE: 'projects:getActive',
  PROJECTS_UPDATE: 'projects:update',
  PROJECTS_DELETE: 'projects:delete',

  // Chats
  CHATS_GET_ALL: 'chats:getAll',
  CHATS_GET: 'chats:get',
  CHATS_CREATE: 'chats:create',
  CHATS_ADD_MESSAGE: 'chats:addMessage',
  CHATS_UPDATE_MESSAGE: 'chats:updateMessage',
  CHATS_SEND_MESSAGE: 'chats:sendMessage',
  CHATS_STREAM_CHUNK: 'chats:streamChunk',

  // User Model
  USER_MODEL_GET_PROPOSITIONS: 'userModel:getPropositions',
  USER_MODEL_ADD: 'userModel:add',
  USER_MODEL_UPDATE: 'userModel:update',
  USER_MODEL_DELETE: 'userModel:delete',

  // Agent Config
  AGENT_CONFIG_GET: 'agentConfig:get',
  AGENT_CONFIG_UPDATE: 'agentConfig:update',

  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_UPDATE: 'settings:update',

  // Recording
  RECORDING_START: 'recording:start',
  RECORDING_STOP: 'recording:stop',
  RECORDING_GET_STATUS: 'recording:getStatus',
  RECORDING_STATUS_CHANGE: 'recording:statusChange',
  RECORDING_TEST_LLM: 'recording:testLLM',  // Single frame LLM test

  // State sync
  STATE_GET_ALL: 'state:getAll',
  STATE_SUBSCRIBE: 'state:subscribe',
  STATE_ON_UPDATE: 'state:onUpdate',

  // Popup
  POPUP_SHOW: 'popup:show',
  POPUP_HIDE: 'popup:hide',
  POPUP_RESIZE: 'popup:resize',
  POPUP_OPEN_MAIN_APP: 'popup:openMainApp',
  POPUP_NAVIGATE_TO_CHAT: 'popup:navigateToChat',
  POPUP_DISABLE_AUTO_CLOSE: 'popup:disableAutoClose',
  POPUP_VISIBILITY_CHANGE: 'popup:visibilityChange'
} as const
