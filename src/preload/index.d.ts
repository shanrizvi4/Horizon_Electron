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
  /** Pre-generated initial chat message shown when user starts chat */
  initialChatMessage?: string
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
  /** Whether user has completed onboarding */
  hasCompletedOnboarding?: boolean
  /** Unix timestamp when onboarding was completed */
  onboardingCompletedAt?: number
}

/**
 * Permission status for macOS permissions.
 */
interface PermissionStatus {
  /** Screen recording permission status */
  screenRecording: boolean
  /** Accessibility permission status */
  accessibility: boolean
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

// =============================================================================
// EVALUATION TYPES
// =============================================================================

/**
 * Frame summary for evaluation list view.
 */
interface FrameSummary {
  /** Unique frame identifier */
  frameId: string
  /** Unix timestamp when frame was captured */
  timestamp: number
  /** Frame capture type */
  type: 'periodic' | 'before' | 'after'
  /** Whether frame has been analyzed */
  hasAnalysis: boolean
  /** Concentration gate decision (if processed) */
  gateDecision?: 'CONTINUE' | 'SKIP'
  /** Number of suggestions this frame contributed to */
  contributedToSuggestions: number
}

/**
 * Embedded suggestion info for frame trace.
 */
interface FrameSuggestionInfo {
  suggestionId: string
  title: string
  description: string
  approach: string
  keywords: string[]
  status: string
  support: number
  rawSupport: number
  scores?: ScoringScores
  filterDecision?: {
    passed: boolean
    reason: string
  }
  deduplication?: {
    isUnique: boolean
    similarities: SuggestionSimilarity[]
  }
}

/**
 * Full frame trace through the pipeline.
 */
interface FrameTrace {
  /** Unique frame identifier */
  frameId: string
  /** Unix timestamp when frame was captured */
  timestamp: number
  /** Path to screenshot file */
  screenshotPath: string
  /** Frame capture type */
  type: 'periodic' | 'before' | 'after'
  /** Frame analysis result (if analyzed) */
  analysis?: {
    frameId: string
    framePath: string
    timestamp: number
    analysis: {
      description: string
      activities: string[]
      applications: string[]
      keywords: string[]
    }
    processedAt: number
    usedLLM: boolean
  }
  /** Concentration gate result (if processed) */
  gateResult?: {
    frameId: string
    decision: 'CONTINUE' | 'SKIP'
    importance: number
    reason: string
    processedAt: number
  }
  /** IDs of suggestions this frame contributed to */
  contributedTo: string[]
  /** Full details of suggestions this frame contributed to */
  suggestions: FrameSuggestionInfo[]
}

/**
 * Suggestion summary for evaluation list view.
 */
interface SuggestionSummaryEval {
  /** Unique suggestion identifier */
  suggestionId: string
  /** Suggestion title */
  title: string
  /** Current status */
  status: string
  /** Combined support score */
  support: number
  /** Unix timestamp when created */
  createdAt: number
  /** Number of source frames */
  sourceFrameCount: number
}

/**
 * Scoring scores for a suggestion.
 */
interface ScoringScores {
  benefit: number
  disruptionCost: number
  missCost: number
  decay: number
  combined: number
}

/**
 * Similarity comparison between suggestions.
 */
interface SuggestionSimilarity {
  suggestion1Id: string
  suggestion2Id: string
  similarity: number
  isDuplicate: boolean
  classification: string
  reason: string
}

/**
 * Full suggestion trace through the pipeline.
 */
interface SuggestionTrace {
  /** Unique suggestion identifier */
  suggestionId: string
  /** Suggestion title */
  title: string
  /** Detailed description */
  description: string
  /** Suggested approach */
  approach: string
  /** Extracted keywords */
  keywords: string[]
  /** Current status */
  status: string
  /** Combined support score */
  support: number
  /** Unix timestamp when created */
  createdAt: number
  /** Source frames that contributed to this suggestion */
  sourceFrames: FrameSummary[]
  /** Generation details (if available) */
  generation?: {
    batchId: string
    rawSupport: number
    supportEvidence: string
    generatedAt: number
  }
  /** Scoring details (if available) */
  scoring?: {
    batchId: string
    scores: ScoringScores
    filterDecision: {
      passed: boolean
      reason: string
    }
    scoredAt: number
  }
  /** Deduplication details (if available) */
  deduplication?: {
    batchId: string
    isUnique: boolean
    similarities: SuggestionSimilarity[]
    processedAt: number
  }
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
    /**
     * Subscribe to navigate to chat events from popup.
     * @returns Cleanup function to unsubscribe
     */
    onNavigateToChat: (callback: (chatId: string) => void) => () => void
  }

  // ---------------------------------------------------------------------------
  // PERMISSIONS
  // ---------------------------------------------------------------------------

  /**
   * macOS permission management.
   */
  permissions: {
    /** Check screen recording permission */
    checkScreenRecording: () => Promise<boolean>
    /** Request screen recording permission */
    requestScreenRecording: () => Promise<boolean>
    /** Check accessibility permission */
    checkAccessibility: () => Promise<boolean>
    /** Request accessibility permission */
    requestAccessibility: () => Promise<boolean>
    /** Open System Preferences to permission pane */
    openPreferences: (pane: 'ScreenCapture' | 'Accessibility') => Promise<{ success: boolean }>
    /** Get all permission statuses */
    getAll: () => Promise<PermissionStatus>
  }

  // ---------------------------------------------------------------------------
  // EVALUATION
  // ---------------------------------------------------------------------------

  /**
   * Pipeline evaluation data access.
   */
  evaluation: {
    /** List all frames with basic metadata */
    listFrames: () => Promise<FrameSummary[]>
    /** List all suggestions with basic metadata */
    listSuggestions: () => Promise<SuggestionSummaryEval[]>
    /** Get full pipeline trace for a frame */
    getFrameTrace: (frameId: string) => Promise<FrameTrace | null>
    /** Get full pipeline trace for a suggestion */
    getSuggestionTrace: (suggestionId: string) => Promise<SuggestionTrace | null>
    /** Get screenshot as base64 data URL */
    getScreenshot: (frameId: string) => Promise<string | null>
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
