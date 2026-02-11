/**
 * =============================================================================
 * PRELOAD TYPE DEFINITIONS
 * =============================================================================
 *
 * TypeScript declarations for the API exposed to the renderer via the preload
 * script. These types are available globally in the renderer process.
 *
 * USAGE IN RENDERER:
 * ```typescript
 * // All API calls are fully typed
 * const suggestions: Suggestion[] = await window.api.suggestions.getAll()
 * const chat: Chat = await window.api.chats.get('some-id')
 * ```
 *
 * @module preload/types
 */

import { ElectronAPI } from '@electron-toolkit/preload'

// =============================================================================
// DATA TYPES
// =============================================================================

/**
 * A user project that groups related suggestions.
 */
interface Project {
  /** Unique project identifier */
  projectId: number
  /** Display title */
  title: string
  /** Project goal/description */
  goal: string
  /** Project lifecycle status */
  status: 'active' | 'deleted' | 'open'
  /** Suggestions associated with this project */
  suggestions: Suggestion[]
  /** Unix timestamp when created */
  createdAt?: number
  /** Unix timestamp when closed/completed */
  closedAt?: number
}

/**
 * An AI-generated suggestion based on screen activity analysis.
 */
interface Suggestion {
  /** Unique suggestion identifier (UUID) */
  suggestionId: string
  /** Associated project ID */
  projectId: number
  /** Display title */
  title: string
  /** Detailed description */
  description: string
  /** Initial prompt used to generate this suggestion */
  initialPrompt: string
  /** Suggestion lifecycle status */
  status: 'active' | 'closed' | 'complete'
  /** Extracted keywords from analysis */
  keywords: string[]
  /** Suggested approach to complete the task */
  approach: string
  /** Raw output from LLM execution */
  executionOutput: string
  /** Summarized execution result */
  executionSummary: { title: string; description: string }
  /** Support/confidence score (0-1) */
  support: number
  /** Utility metrics for prioritization */
  utilities: Utilities
  /** Evidence/source references */
  grounding: string[]
  /** Unix timestamp when created */
  createdAt?: number
  /** Unix timestamp when last updated */
  updatedAt?: number
  /** Unix timestamp when closed */
  closedAt?: number
}

/**
 * Utility metrics used for suggestion prioritization.
 */
interface Utilities {
  /** Sequential task number for ordering */
  taskNumber: number
  /** Expected benefit if acted upon (0-1) */
  benefit: number
  /** Cost of false positive (suggesting irrelevant task) */
  falsePositiveCost: number
  /** Cost of false negative (missing relevant task) */
  falseNegativeCost: number
  /** Time decay factor for relevance */
  decay: number
}

/**
 * A conversation with the LLM assistant.
 */
interface Chat {
  /** Unique chat identifier (UUID) */
  id: string
  /** Display title (usually derived from first message) */
  title: string
  /** Conversation message history */
  messages: Message[]
  /** Whether the LLM has responded at least once */
  hasReceivedInitialResponse: boolean
  /** Whether waiting for LLM response */
  isLoadingResponse: boolean
  /** System prompt for this chat context */
  initialPrompt?: string
  /** Link to related project */
  associatedProjectId?: number
  /** Link to related suggestion */
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
interface Message {
  /** Unique message identifier (UUID) */
  id: string
  /** Message sender role */
  role: 'user' | 'assistant' | 'prompt'
  /** Message text content */
  content: string
  /** True if this is a placeholder for streaming response */
  isPlaceholder: boolean
  /** True if this message represents an error */
  isError: boolean
}

/**
 * A user-provided fact or preference stored in the user model.
 *
 * These propositions help personalize AI responses and suggestions.
 */
interface UserProposition {
  /** Unique proposition identifier (UUID) */
  id: string
  /** The proposition text content */
  text: string
  /** History of edits to this proposition */
  editHistory: string[]
}

/**
 * Agent customization settings.
 *
 * Allows users to tune the AI's behavior and focus areas.
 */
interface CustomizeAgentData {
  /** Topics/areas to emphasize in suggestions */
  focusMoreOn: string
  /** Topics/areas to de-emphasize */
  focusLessOn: string
  /** Communication style preference */
  style: string
}

/**
 * Application settings.
 */
interface AppSettings {
  /** How often to show notifications (minutes) */
  notificationFrequency: number
  /** Whether screen recording is enabled */
  recordingEnabled: boolean
  /** Whether to disable the popup window */
  disablePopup: boolean
}

/**
 * Study participation status.
 */
interface StudyStatus {
  /** Current study status */
  status: string
  /** Unix timestamp when study period ends */
  endTime?: number
}

/**
 * Complete application state.
 *
 * This is the shape of data synchronized across all windows
 * via the state API.
 */
interface AppState {
  /** All user projects */
  projects: Project[]
  /** All AI suggestions */
  suggestions: Suggestion[]
  /** All chat conversations */
  chats: Chat[]
  /** User propositions/memories */
  userPropositions: UserProposition[]
  /** Agent customization config */
  agentConfig: CustomizeAgentData
  /** Study participation status */
  studyStatus: StudyStatus
  /** Application settings */
  settings: AppSettings
  /** Incremental update counter for sync */
  lastUpdateId: number
  /** Timestamp of last processed screenshot */
  lastProcessedTimestamp: number
}

// =============================================================================
// API TYPE DEFINITIONS
// =============================================================================

/**
 * The complete GUMBO API exposed via window.api.
 *
 * All methods return Promises that resolve when the main process
 * completes the operation.
 */
interface GumboAPI {
  // ---------------------------------------------------------------------------
  // SUGGESTIONS
  // ---------------------------------------------------------------------------

  /**
   * AI suggestion management.
   */
  suggestions: {
    /** Get all suggestions (including dismissed) */
    getAll: () => Promise<Suggestion[]>
    /** Get only active suggestions */
    getActive: () => Promise<Suggestion[]>
    /** Update suggestion properties */
    update: (id: string, data: Partial<Suggestion>) => Promise<{ success: boolean }>
    /** Dismiss a suggestion */
    dismiss: (id: string) => Promise<{ success: boolean }>
    /** Mark suggestion as complete */
    complete: (id: string) => Promise<{ success: boolean }>
  }

  // ---------------------------------------------------------------------------
  // PROJECTS
  // ---------------------------------------------------------------------------

  /**
   * Project management.
   */
  projects: {
    /** Get all projects */
    getAll: () => Promise<Project[]>
    /** Get only active projects */
    getActive: () => Promise<Project[]>
    /** Update project properties */
    update: (id: number, data: Partial<Project>) => Promise<{ success: boolean }>
    /** Delete a project */
    delete: (id: number) => Promise<{ success: boolean }>
  }

  // ---------------------------------------------------------------------------
  // CHATS
  // ---------------------------------------------------------------------------

  /**
   * Chat and LLM interaction.
   *
   * Supports streaming responses via onStreamChunk.
   */
  chats: {
    /** Get all chats */
    getAll: () => Promise<Chat[]>
    /** Get single chat by ID */
    get: (id: string) => Promise<Chat | undefined>
    /** Create a new chat */
    create: (data: Chat) => Promise<Chat>
    /** Add message to chat */
    addMessage: (chatId: string, message: Message) => Promise<Message>
    /** Update existing message */
    updateMessage: (
      chatId: string,
      messageId: string,
      updates: Partial<Message>
    ) => Promise<{ success: boolean }>
    /** Send message and get LLM response */
    sendMessage: (chatId: string, content: string) => Promise<{ success: boolean }>
    /**
     * Subscribe to streaming response chunks.
     * @returns Cleanup function to unsubscribe
     */
    onStreamChunk: (callback: (data: { chatId: string; chunk: string }) => void) => () => void
  }

  // ---------------------------------------------------------------------------
  // USER MODEL
  // ---------------------------------------------------------------------------

  /**
   * User proposition/memory management.
   */
  userModel: {
    /** Get all propositions */
    getPropositions: () => Promise<UserProposition[]>
    /** Add new proposition */
    add: (text: string) => Promise<UserProposition>
    /** Update proposition text */
    update: (id: string, text: string) => Promise<{ success: boolean }>
    /** Delete proposition */
    delete: (id: string) => Promise<{ success: boolean }>
  }

  // ---------------------------------------------------------------------------
  // AGENT CONFIG
  // ---------------------------------------------------------------------------

  /**
   * Agent customization.
   */
  agentConfig: {
    /** Get current configuration */
    get: () => Promise<CustomizeAgentData>
    /** Update configuration */
    update: (data: Partial<CustomizeAgentData>) => Promise<{ success: boolean }>
  }

  // ---------------------------------------------------------------------------
  // SETTINGS
  // ---------------------------------------------------------------------------

  /**
   * Application settings.
   */
  settings: {
    /** Get current settings */
    get: () => Promise<AppSettings>
    /** Update settings */
    update: (data: Partial<AppSettings>) => Promise<{ success: boolean }>
  }

  // ---------------------------------------------------------------------------
  // RECORDING
  // ---------------------------------------------------------------------------

  /**
   * Screen capture control.
   */
  recording: {
    /** Start recording */
    start: () => Promise<{ success: boolean }>
    /** Stop recording */
    stop: () => Promise<{ success: boolean }>
    /** Get recording status */
    getStatus: () => Promise<boolean>
    /**
     * Subscribe to recording status changes.
     * @returns Cleanup function to unsubscribe
     */
    onStatusChange: (callback: (isRecording: boolean) => void) => () => void
  }

  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  /**
   * Multi-window state synchronization.
   */
  state: {
    /** Get complete application state */
    getAll: () => Promise<AppState>
    /** Subscribe this window to state updates */
    subscribe: () => Promise<{ success: boolean }>
    /**
     * Listen for state updates.
     * @returns Cleanup function to unsubscribe
     */
    onUpdate: (callback: (state: AppState) => void) => () => void
  }

  // ---------------------------------------------------------------------------
  // POPUP
  // ---------------------------------------------------------------------------

  /**
   * Popup window management.
   */
  popup: {
    /** Show popup */
    show: () => Promise<{ success: boolean }>
    /** Hide popup */
    hide: () => Promise<{ success: boolean }>
    /** Resize popup */
    resize: (width: number, height: number) => Promise<{ success: boolean }>
    /** Open main app window */
    openMainApp: () => Promise<{ success: boolean }>
    /** Navigate main app to chat */
    navigateToChat: (chatId: string) => Promise<{ success: boolean }>
    /** Temporarily disable auto-close */
    disableAutoClose: (durationMs?: number) => Promise<{ success: boolean }>
    /**
     * Subscribe to visibility changes.
     * @returns Cleanup function to unsubscribe
     */
    onVisibilityChange: (callback: (visible: boolean) => void) => () => void
  }
}

// =============================================================================
// GLOBAL DECLARATIONS
// =============================================================================

/**
 * Global type augmentation for window object.
 *
 * After the preload script runs, these properties are available
 * on the window object in the renderer process.
 */
declare global {
  interface Window {
    /** Electron toolkit API (clipboard, shell, etc.) */
    electron: ElectronAPI
    /** GUMBO application API */
    api: GumboAPI
  }
}
