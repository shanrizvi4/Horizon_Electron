/**
 * =============================================================================
 * MAIN PROCESS TYPE DEFINITIONS
 * =============================================================================
 *
 * TypeScript interfaces for the main process, mirroring the renderer types.
 * These define the data structures used throughout the application.
 *
 * TYPE CATEGORIES:
 * - Data Models: Project, Suggestion, Chat, Message, UserProposition
 * - Configuration: CustomizeAgentData, AppSettings
 * - State: AppState (complete application state)
 * - IPC: IPC_CHANNELS (communication channel names)
 *
 * @module types
 */

// =============================================================================
// DATA MODELS
// =============================================================================

/**
 * A user project that groups related suggestions.
 *
 * Projects help organize work contexts and can be created automatically
 * when new suggestion categories emerge.
 */
export interface Project {
  /** Unique project identifier */
  projectId: number

  /** Display title (e.g., "API Development") */
  title: string

  /** Project goal or description */
  goal: string

  /** Project lifecycle status */
  status: 'active' | 'deleted' | 'open'

  /** Suggestions associated with this project (nested for convenience) */
  suggestions: Suggestion[]

  /** Unix timestamp when project was created */
  createdAt?: number

  /** Unix timestamp when project was closed */
  closedAt?: number
}

/**
 * An AI-generated suggestion based on screen activity analysis.
 *
 * Suggestions are the core output of the GUMBO pipeline:
 * Screenshots → Frame Analysis → Suggestion Generation → Scoring → Deduplication
 */
export interface Suggestion {
  /** Unique suggestion identifier (UUID format: sugg_<timestamp>_<random>) */
  suggestionId: string

  /** ID of the parent project */
  projectId: number

  /** Display title (short, actionable) */
  title: string

  /** Detailed description of the suggested task */
  description: string

  /** System prompt used when opening a chat for this suggestion */
  initialPrompt: string

  /** Suggestion lifecycle status */
  status: 'active' | 'closed' | 'complete'

  /** Keywords extracted from the screen analysis */
  keywords: string[]

  /** Suggested approach to complete the task */
  approach: string

  /** Raw output from any execution (populated when user acts on suggestion) */
  executionOutput: string

  /** Summarized execution result for display */
  executionSummary: { title: string; description: string }

  /** Support/confidence score from the pipeline (0-1) */
  support: number

  /** Utility metrics used for prioritization */
  utilities: Utilities

  /** Evidence/sources that support this suggestion */
  grounding: string[]

  /** Unix timestamp when created */
  createdAt?: number

  /** Unix timestamp when last updated */
  updatedAt?: number

  /** Unix timestamp when closed/completed */
  closedAt?: number
}

/**
 * Utility metrics for suggestion prioritization.
 *
 * These values are used to rank suggestions by relevance and urgency.
 */
export interface Utilities {
  /** Sequential task number for ordering */
  taskNumber: number

  /** Expected benefit if user acts on this (0-1) */
  benefit: number

  /** Cost of false positive - suggesting irrelevant task (0-1) */
  falsePositiveCost: number

  /** Cost of false negative - missing relevant task (0-1) */
  falseNegativeCost: number

  /** Time decay factor - how quickly relevance decreases (0-1) */
  decay: number
}

/**
 * A conversation with the LLM assistant.
 *
 * Chats can be standalone or associated with a suggestion/project.
 */
export interface Chat {
  /** Unique chat identifier (UUID format: chat_<timestamp>_<random>) */
  id: string

  /** Display title (usually derived from first message or associated suggestion) */
  title: string

  /** Conversation message history */
  messages: Message[]

  /** Whether the LLM has responded at least once */
  hasReceivedInitialResponse: boolean

  /** Whether currently waiting for LLM response */
  isLoadingResponse: boolean

  /** System prompt for this chat context */
  initialPrompt?: string

  /** Link to related project (if any) */
  associatedProjectId?: number

  /** Link to related suggestion (if any) */
  associatedSuggestionId?: string

  /** Unix timestamp when created */
  createdAt?: number

  /** Unix timestamp when closed */
  closedAt?: number

  /** Chat lifecycle status */
  status: string
}

/**
 * A single message in a chat conversation.
 */
export interface Message {
  /** Unique message identifier (UUID format: msg_<timestamp>_<random>) */
  id: string

  /** Message sender role */
  role: 'user' | 'assistant' | 'prompt'

  /** Message text content (supports markdown) */
  content: string

  /** True if this is a placeholder for streaming response */
  isPlaceholder: boolean

  /** True if this message represents an error */
  isError: boolean
}

/**
 * A user-provided fact or preference stored in the user model.
 *
 * Propositions help personalize AI responses and suggestions.
 */
export interface UserProposition {
  /** Unique proposition identifier */
  id: string

  /** The proposition text content */
  text: string

  /** History of previous values (for undo/tracking) */
  editHistory: string[]
}

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Agent customization settings.
 *
 * These preferences are included in LLM prompts to personalize behavior.
 */
export interface CustomizeAgentData {
  /** Topics/areas to emphasize in suggestions */
  focusMoreOn: string

  /** Topics/areas to de-emphasize */
  focusLessOn: string

  /** Communication style preference (e.g., "concise", "detailed") */
  style: string
}

/**
 * Study participation status (for research deployments).
 */
export interface StudyStatus {
  /** Current study status */
  status: string

  /** Unix timestamp when study period ends */
  endTime?: number
}

/**
 * Application settings.
 */
export interface AppSettings {
  /** How often to show notifications (minutes) */
  notificationFrequency: number

  /** Whether screen recording is enabled */
  recordingEnabled: boolean

  /** Whether to disable the popup window */
  disablePopup: boolean
}

// =============================================================================
// APPLICATION STATE
// =============================================================================

/**
 * Complete application state.
 *
 * This is the shape of the persisted state in state.json and the data
 * synchronized across all windows.
 */
export interface AppState {
  /** All user projects */
  projects: Project[]

  /** All AI-generated suggestions */
  suggestions: Suggestion[]

  /** All chat conversations */
  chats: Chat[]

  /** User propositions (memories/preferences) */
  userPropositions: UserProposition[]

  /** Agent customization configuration */
  agentConfig: CustomizeAgentData

  /** Study participation status */
  studyStatus: StudyStatus

  /** Application settings */
  settings: AppSettings

  /** Incremental update counter for state sync */
  lastUpdateId: number

  /** Timestamp of last processed screenshot */
  lastProcessedTimestamp: number
}

// =============================================================================
// IPC CHANNEL NAMES
// =============================================================================

/**
 * All IPC channel names for main ↔ renderer communication.
 *
 * These must match the channel names used in the preload script.
 *
 * Naming convention: 'domain:action'
 * - domain: The data entity or feature (e.g., 'suggestions', 'chats')
 * - action: The operation being performed (e.g., 'getAll', 'update')
 */
export const IPC_CHANNELS = {
  // ---------------------------------------------------------------------------
  // SUGGESTIONS - AI-generated task suggestions
  // ---------------------------------------------------------------------------
  /** Get all suggestions */
  SUGGESTIONS_GET_ALL: 'suggestions:getAll',
  /** Get only active suggestions */
  SUGGESTIONS_GET_ACTIVE: 'suggestions:getActive',
  /** Update suggestion properties */
  SUGGESTIONS_UPDATE: 'suggestions:update',
  /** Dismiss a suggestion */
  SUGGESTIONS_DISMISS: 'suggestions:dismiss',
  /** Mark suggestion as complete */
  SUGGESTIONS_COMPLETE: 'suggestions:complete',

  // ---------------------------------------------------------------------------
  // PROJECTS - User project organization
  // ---------------------------------------------------------------------------
  /** Get all projects */
  PROJECTS_GET_ALL: 'projects:getAll',
  /** Get only active projects */
  PROJECTS_GET_ACTIVE: 'projects:getActive',
  /** Update project properties */
  PROJECTS_UPDATE: 'projects:update',
  /** Delete a project */
  PROJECTS_DELETE: 'projects:delete',

  // ---------------------------------------------------------------------------
  // CHATS - LLM conversations
  // ---------------------------------------------------------------------------
  /** Get all chats */
  CHATS_GET_ALL: 'chats:getAll',
  /** Get single chat by ID */
  CHATS_GET: 'chats:get',
  /** Create new chat */
  CHATS_CREATE: 'chats:create',
  /** Add message to chat */
  CHATS_ADD_MESSAGE: 'chats:addMessage',
  /** Update existing message */
  CHATS_UPDATE_MESSAGE: 'chats:updateMessage',
  /** Send message and get LLM response */
  CHATS_SEND_MESSAGE: 'chats:sendMessage',
  /** Event: Streaming response chunk from LLM */
  CHATS_STREAM_CHUNK: 'chats:streamChunk',

  // ---------------------------------------------------------------------------
  // USER MODEL - User preferences and memories
  // ---------------------------------------------------------------------------
  /** Get all user propositions */
  USER_MODEL_GET_PROPOSITIONS: 'userModel:getPropositions',
  /** Add new proposition */
  USER_MODEL_ADD: 'userModel:add',
  /** Update proposition text */
  USER_MODEL_UPDATE: 'userModel:update',
  /** Delete proposition */
  USER_MODEL_DELETE: 'userModel:delete',

  // ---------------------------------------------------------------------------
  // AGENT CONFIG - Customize AI behavior
  // ---------------------------------------------------------------------------
  /** Get agent customization config */
  AGENT_CONFIG_GET: 'agentConfig:get',
  /** Update agent customization */
  AGENT_CONFIG_UPDATE: 'agentConfig:update',

  // ---------------------------------------------------------------------------
  // SETTINGS - Application settings
  // ---------------------------------------------------------------------------
  /** Get app settings */
  SETTINGS_GET: 'settings:get',
  /** Update app settings */
  SETTINGS_UPDATE: 'settings:update',

  // ---------------------------------------------------------------------------
  // RECORDING - Screen capture control
  // ---------------------------------------------------------------------------
  /** Start screen recording */
  RECORDING_START: 'recording:start',
  /** Stop screen recording */
  RECORDING_STOP: 'recording:stop',
  /** Get current recording status */
  RECORDING_GET_STATUS: 'recording:getStatus',
  /** Event: Recording status changed */
  RECORDING_STATUS_CHANGE: 'recording:statusChange',
  /** Test LLM analysis on single frame (debugging) */
  RECORDING_TEST_LLM: 'recording:testLLM',

  // ---------------------------------------------------------------------------
  // STATE - Multi-window synchronization
  // ---------------------------------------------------------------------------
  /** Get complete application state */
  STATE_GET_ALL: 'state:getAll',
  /** Subscribe to state updates */
  STATE_SUBSCRIBE: 'state:subscribe',
  /** Event: State was updated */
  STATE_ON_UPDATE: 'state:onUpdate',

  // ---------------------------------------------------------------------------
  // POPUP - Popup window management
  // ---------------------------------------------------------------------------
  /** Show popup window */
  POPUP_SHOW: 'popup:show',
  /** Hide popup window */
  POPUP_HIDE: 'popup:hide',
  /** Resize popup window */
  POPUP_RESIZE: 'popup:resize',
  /** Open main app window */
  POPUP_OPEN_MAIN_APP: 'popup:openMainApp',
  /** Navigate main app to specific chat */
  POPUP_NAVIGATE_TO_CHAT: 'popup:navigateToChat',
  /** Temporarily disable popup auto-close */
  POPUP_DISABLE_AUTO_CLOSE: 'popup:disableAutoClose',
  /** Event: Popup visibility changed */
  POPUP_VISIBILITY_CHANGE: 'popup:visibilityChange'
} as const
