/**
 * =============================================================================
 * PRELOAD SCRIPT - API BRIDGE
 * =============================================================================
 *
 * This script runs in an isolated context between the main process and renderer.
 * It safely exposes selected IPC methods to the renderer via `window.api`.
 *
 * SECURITY MODEL:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  RENDERER (Untrusted)                                                   │
 * │  ┌─────────────────────────────────────────────────────────────────┐   │
 * │  │  React Components                                               │   │
 * │  │  - Can ONLY access window.api methods                           │   │
 * │  │  - Cannot directly access Node.js or Electron APIs              │   │
 * │  │  - Cannot invoke arbitrary IPC channels                         │   │
 * │  └─────────────────────────────────────────────────────────────────┘   │
 * └─────────────────────────────────────────────────────────────────────────┘
 *                                      │
 *                          contextBridge.exposeInMainWorld()
 *                                      │
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  PRELOAD (This Script - Isolated Context)                               │
 * │  ┌─────────────────────────────────────────────────────────────────┐   │
 * │  │  - Has access to Node.js and Electron APIs                      │   │
 * │  │  - Defines the EXACT API shape exposed to renderer              │   │
 * │  │  - Only exposes specific, pre-defined IPC channels              │   │
 * │  │  - Acts as security boundary                                    │   │
 * │  └─────────────────────────────────────────────────────────────────┘   │
 * └─────────────────────────────────────────────────────────────────────────┘
 *                                      │
 *                              ipcRenderer.invoke()
 *                                      │
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  MAIN PROCESS (Trusted)                                                 │
 * │  ┌─────────────────────────────────────────────────────────────────┐   │
 * │  │  IPC Handlers → Services → File System, Network, etc.           │   │
 * │  └─────────────────────────────────────────────────────────────────┘   │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * API CATEGORIES:
 * - suggestions : CRUD for AI-generated suggestions
 * - projects    : CRUD for user projects
 * - chats       : Chat creation and LLM messaging with streaming
 * - userModel   : User propositions (memories/preferences)
 * - agentConfig : Agent customization settings
 * - settings    : Application settings
 * - recording   : Screen capture control
 * - state       : Multi-window state synchronization
 * - popup       : Popup window management
 *
 * @module preload
 */

import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// =============================================================================
// IPC CHANNEL DEFINITIONS
// =============================================================================

/**
 * All IPC channel names used for main ↔ renderer communication.
 *
 * IMPORTANT: These must exactly match the channel names defined in
 * the main process (src/main/types.ts → IPC_CHANNELS).
 *
 * Naming convention: 'domain:action'
 * - domain: The data entity or feature (e.g., 'suggestions', 'chats')
 * - action: The operation being performed (e.g., 'getAll', 'update')
 */
const IPC_CHANNELS = {
  // ---------------------------------------------------------------------------
  // SUGGESTIONS - AI-generated task suggestions
  // ---------------------------------------------------------------------------
  /** Get all suggestions */
  SUGGESTIONS_GET_ALL: 'suggestions:getAll',
  /** Get only active (non-dismissed) suggestions */
  SUGGESTIONS_GET_ACTIVE: 'suggestions:getActive',
  /** Update suggestion properties */
  SUGGESTIONS_UPDATE: 'suggestions:update',
  /** Dismiss (hide) a suggestion */
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
  /** Send message and get LLM response (triggers streaming) */
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
  POPUP_VISIBILITY_CHANGE: 'popup:visibilityChange',

  // ---------------------------------------------------------------------------
  // PERMISSIONS - macOS permission management
  // ---------------------------------------------------------------------------
  /** Check screen recording permission status */
  PERMISSIONS_CHECK_SCREEN_RECORDING: 'permissions:checkScreenRecording',
  /** Request screen recording permission */
  PERMISSIONS_REQUEST_SCREEN_RECORDING: 'permissions:requestScreenRecording',
  /** Check accessibility permission status */
  PERMISSIONS_CHECK_ACCESSIBILITY: 'permissions:checkAccessibility',
  /** Request accessibility permission */
  PERMISSIONS_REQUEST_ACCESSIBILITY: 'permissions:requestAccessibility',
  /** Open System Preferences to specific pane */
  PERMISSIONS_OPEN_PREFERENCES: 'permissions:openPreferences',
  /** Get all permission statuses */
  PERMISSIONS_GET_ALL: 'permissions:getAll',

  // ---------------------------------------------------------------------------
  // EVALUATION - Pipeline evaluation data
  // ---------------------------------------------------------------------------
  /** List all frames with basic metadata */
  EVALUATION_LIST_FRAMES: 'evaluation:listFrames',
  /** List all suggestions with basic metadata */
  EVALUATION_LIST_SUGGESTIONS: 'evaluation:listSuggestions',
  /** Get full pipeline trace for a frame */
  EVALUATION_GET_FRAME_TRACE: 'evaluation:getFrameTrace',
  /** Get full pipeline trace for a suggestion */
  EVALUATION_GET_SUGGESTION_TRACE: 'evaluation:getSuggestionTrace',
  /** Get screenshot as base64 data URL */
  EVALUATION_GET_SCREENSHOT: 'evaluation:getScreenshot'
} as const

// =============================================================================
// API DEFINITION
// =============================================================================

/**
 * The API object exposed to the renderer via `window.api`.
 *
 * Each method wraps an IPC call to the main process. The API is organized
 * into logical namespaces matching the data domains.
 *
 * USAGE IN RENDERER:
 * ```typescript
 * // Get all suggestions
 * const suggestions = await window.api.suggestions.getAll()
 *
 * // Send chat message with streaming response
 * const unsubscribe = window.api.chats.onStreamChunk(({ chatId, chunk }) => {
 *   console.log('Received chunk:', chunk)
 * })
 * await window.api.chats.sendMessage(chatId, 'Hello!')
 * unsubscribe()
 * ```
 */
const api = {
  // ---------------------------------------------------------------------------
  // SUGGESTIONS API
  // ---------------------------------------------------------------------------

  /**
   * Suggestion management methods.
   *
   * Suggestions are AI-generated task recommendations based on
   * screen activity analysis.
   */
  suggestions: {
    /** Fetch all suggestions (including dismissed) */
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.SUGGESTIONS_GET_ALL),

    /** Fetch only active suggestions */
    getActive: () => ipcRenderer.invoke(IPC_CHANNELS.SUGGESTIONS_GET_ACTIVE),

    /** Update suggestion properties (title, description, etc.) */
    update: (id: string, data: unknown) =>
      ipcRenderer.invoke(IPC_CHANNELS.SUGGESTIONS_UPDATE, id, data),

    /** Dismiss a suggestion (sets status to 'closed') */
    dismiss: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.SUGGESTIONS_DISMISS, id),

    /** Mark suggestion as complete */
    complete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.SUGGESTIONS_COMPLETE, id)
  },

  // ---------------------------------------------------------------------------
  // PROJECTS API
  // ---------------------------------------------------------------------------

  /**
   * Project management methods.
   *
   * Projects group related suggestions together and help organize
   * the user's work context.
   */
  projects: {
    /** Fetch all projects */
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.PROJECTS_GET_ALL),

    /** Fetch only active projects */
    getActive: () => ipcRenderer.invoke(IPC_CHANNELS.PROJECTS_GET_ACTIVE),

    /** Update project properties (title, goal, etc.) */
    update: (id: number, data: unknown) =>
      ipcRenderer.invoke(IPC_CHANNELS.PROJECTS_UPDATE, id, data),

    /** Delete a project (soft delete - sets status) */
    delete: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.PROJECTS_DELETE, id)
  },

  // ---------------------------------------------------------------------------
  // CHATS API
  // ---------------------------------------------------------------------------

  /**
   * Chat management methods with LLM integration.
   *
   * Chats support streaming responses from the LLM. Use `onStreamChunk`
   * to receive response chunks in real-time.
   *
   * STREAMING FLOW:
   * 1. Call `sendMessage(chatId, content)` to initiate
   * 2. Subscribe to chunks via `onStreamChunk(callback)`
   * 3. Receive chunks as they arrive from LLM
   * 4. When response complete, `sendMessage` promise resolves
   */
  chats: {
    /** Fetch all chats */
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.CHATS_GET_ALL),

    /** Fetch single chat with full message history */
    get: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.CHATS_GET, id),

    /** Create a new chat (ID should be pre-generated) */
    create: (data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.CHATS_CREATE, data),

    /** Add a message to a chat (user messages, placeholders) */
    addMessage: (chatId: string, message: unknown) =>
      ipcRenderer.invoke(IPC_CHANNELS.CHATS_ADD_MESSAGE, chatId, message),

    /** Update an existing message (for updating placeholders with content) */
    updateMessage: (chatId: string, messageId: string, updates: unknown) =>
      ipcRenderer.invoke(IPC_CHANNELS.CHATS_UPDATE_MESSAGE, chatId, messageId, updates),

    /** Send message to LLM and get streaming response */
    sendMessage: (chatId: string, content: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.CHATS_SEND_MESSAGE, chatId, content),

    /**
     * Subscribe to streaming response chunks.
     *
     * @param callback - Called for each chunk received
     * @returns Cleanup function to unsubscribe
     *
     * @example
     * ```typescript
     * const unsubscribe = window.api.chats.onStreamChunk(({ chatId, chunk }) => {
     *   accumulatedText += chunk
     *   updateUI(accumulatedText)
     * })
     * // Later: unsubscribe()
     * ```
     */
    onStreamChunk: (callback: (data: { chatId: string; chunk: string }) => void) => {
      const listener = (
        _event: Electron.IpcRendererEvent,
        data: { chatId: string; chunk: string }
      ) => {
        callback(data)
      }
      ipcRenderer.on(IPC_CHANNELS.CHATS_STREAM_CHUNK, listener)
      // Return cleanup function
      return () => ipcRenderer.removeListener(IPC_CHANNELS.CHATS_STREAM_CHUNK, listener)
    }
  },

  // ---------------------------------------------------------------------------
  // USER MODEL API
  // ---------------------------------------------------------------------------

  /**
   * User proposition (memory) management.
   *
   * Propositions are user-provided facts and preferences that the AI
   * uses to personalize suggestions and responses.
   */
  userModel: {
    /** Fetch all user propositions */
    getPropositions: () => ipcRenderer.invoke(IPC_CHANNELS.USER_MODEL_GET_PROPOSITIONS),

    /** Add a new proposition */
    add: (text: string) => ipcRenderer.invoke(IPC_CHANNELS.USER_MODEL_ADD, text),

    /** Update proposition text */
    update: (id: string, text: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.USER_MODEL_UPDATE, id, text),

    /** Delete a proposition */
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.USER_MODEL_DELETE, id)
  },

  // ---------------------------------------------------------------------------
  // AGENT CONFIG API
  // ---------------------------------------------------------------------------

  /**
   * Agent customization configuration.
   *
   * Allows users to customize the AI's focus areas and communication style.
   */
  agentConfig: {
    /** Get current agent configuration */
    get: () => ipcRenderer.invoke(IPC_CHANNELS.AGENT_CONFIG_GET),

    /** Update agent configuration */
    update: (data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.AGENT_CONFIG_UPDATE, data)
  },

  // ---------------------------------------------------------------------------
  // SETTINGS API
  // ---------------------------------------------------------------------------

  /**
   * Application settings management.
   */
  settings: {
    /** Get current settings */
    get: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET),

    /** Update settings */
    update: (data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_UPDATE, data)
  },

  // ---------------------------------------------------------------------------
  // RECORDING API
  // ---------------------------------------------------------------------------

  /**
   * Screen capture control.
   *
   * Controls the screenshot capture system that feeds the AI pipeline.
   */
  recording: {
    /** Start screen recording */
    start: () => ipcRenderer.invoke(IPC_CHANNELS.RECORDING_START),

    /** Stop screen recording */
    stop: () => ipcRenderer.invoke(IPC_CHANNELS.RECORDING_STOP),

    /** Get current recording status (true = recording) */
    getStatus: () => ipcRenderer.invoke(IPC_CHANNELS.RECORDING_GET_STATUS),

    /**
     * Subscribe to recording status changes.
     *
     * @param callback - Called when recording starts or stops
     * @returns Cleanup function to unsubscribe
     */
    onStatusChange: (callback: (isRecording: boolean) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, isRecording: boolean) => {
        callback(isRecording)
      }
      ipcRenderer.on(IPC_CHANNELS.RECORDING_STATUS_CHANGE, listener)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.RECORDING_STATUS_CHANGE, listener)
    }
  },

  // ---------------------------------------------------------------------------
  // STATE API
  // ---------------------------------------------------------------------------

  /**
   * Multi-window state synchronization.
   *
   * Enables all windows to stay in sync when state changes occur.
   * The renderer should subscribe on mount and update local state
   * when onUpdate fires.
   *
   * USAGE:
   * ```typescript
   * useEffect(() => {
   *   // Subscribe to updates
   *   window.api.state.subscribe()
   *
   *   // Listen for state changes
   *   const unsubscribe = window.api.state.onUpdate((newState) => {
   *     dispatch({ type: 'SET_STATE', payload: newState })
   *   })
   *
   *   return unsubscribe
   * }, [])
   * ```
   */
  state: {
    /** Get complete application state */
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.STATE_GET_ALL),

    /** Subscribe this window to state updates */
    subscribe: () => ipcRenderer.invoke(IPC_CHANNELS.STATE_SUBSCRIBE),

    /**
     * Listen for state updates from main process.
     *
     * @param callback - Called with new state when any change occurs
     * @returns Cleanup function to unsubscribe
     */
    onUpdate: (callback: (state: unknown) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, state: unknown) => {
        callback(state)
      }
      ipcRenderer.on(IPC_CHANNELS.STATE_ON_UPDATE, listener)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.STATE_ON_UPDATE, listener)
    }
  },

  // ---------------------------------------------------------------------------
  // POPUP API
  // ---------------------------------------------------------------------------

  /**
   * Popup window management.
   *
   * Controls the floating popup window that shows quick access to
   * suggestions and chats.
   */
  popup: {
    /** Show the popup window */
    show: () => ipcRenderer.invoke(IPC_CHANNELS.POPUP_SHOW),

    /** Hide the popup window */
    hide: () => ipcRenderer.invoke(IPC_CHANNELS.POPUP_HIDE),

    /** Resize the popup window */
    resize: (width: number, height: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.POPUP_RESIZE, width, height),

    /** Open the main application window */
    openMainApp: () => ipcRenderer.invoke(IPC_CHANNELS.POPUP_OPEN_MAIN_APP),

    /** Navigate main app to a specific chat */
    navigateToChat: (chatId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.POPUP_NAVIGATE_TO_CHAT, chatId),

    /** Temporarily disable popup auto-close behavior */
    disableAutoClose: (durationMs?: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.POPUP_DISABLE_AUTO_CLOSE, durationMs),

    /**
     * Subscribe to popup visibility changes.
     *
     * @param callback - Called when popup becomes visible or hidden
     * @returns Cleanup function to unsubscribe
     */
    onVisibilityChange: (callback: (visible: boolean) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, visible: boolean) => {
        callback(visible)
      }
      ipcRenderer.on(IPC_CHANNELS.POPUP_VISIBILITY_CHANGE, listener)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.POPUP_VISIBILITY_CHANGE, listener)
    }
  },

  // ---------------------------------------------------------------------------
  // PERMISSIONS API
  // ---------------------------------------------------------------------------

  /**
   * macOS permission management.
   *
   * Provides methods to check and request system permissions required
   * for screen recording and accessibility features.
   */
  permissions: {
    /** Check if screen recording permission is granted */
    checkScreenRecording: () =>
      ipcRenderer.invoke(IPC_CHANNELS.PERMISSIONS_CHECK_SCREEN_RECORDING),

    /** Request screen recording permission (triggers system dialog) */
    requestScreenRecording: () =>
      ipcRenderer.invoke(IPC_CHANNELS.PERMISSIONS_REQUEST_SCREEN_RECORDING),

    /** Check if accessibility permission is granted */
    checkAccessibility: () => ipcRenderer.invoke(IPC_CHANNELS.PERMISSIONS_CHECK_ACCESSIBILITY),

    /** Request accessibility permission (triggers system dialog) */
    requestAccessibility: () =>
      ipcRenderer.invoke(IPC_CHANNELS.PERMISSIONS_REQUEST_ACCESSIBILITY),

    /** Open System Preferences to a specific privacy pane */
    openPreferences: (pane: 'ScreenCapture' | 'Accessibility') =>
      ipcRenderer.invoke(IPC_CHANNELS.PERMISSIONS_OPEN_PREFERENCES, pane),

    /** Get all permission statuses at once */
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.PERMISSIONS_GET_ALL)
  },

  // ---------------------------------------------------------------------------
  // EVALUATION API
  // ---------------------------------------------------------------------------

  /**
   * Pipeline evaluation data access.
   *
   * Provides methods to access frame analyses, suggestion traces, and
   * other pipeline data for evaluation and debugging purposes.
   */
  evaluation: {
    /** List all frames with basic metadata (sorted by timestamp, newest first) */
    listFrames: () => ipcRenderer.invoke(IPC_CHANNELS.EVALUATION_LIST_FRAMES),

    /** List all suggestions with basic metadata (sorted by timestamp, newest first) */
    listSuggestions: () => ipcRenderer.invoke(IPC_CHANNELS.EVALUATION_LIST_SUGGESTIONS),

    /** Get full pipeline trace for a specific frame */
    getFrameTrace: (frameId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.EVALUATION_GET_FRAME_TRACE, frameId),

    /** Get full pipeline trace for a specific suggestion */
    getSuggestionTrace: (suggestionId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.EVALUATION_GET_SUGGESTION_TRACE, suggestionId),

    /** Get screenshot as base64 data URL */
    getScreenshot: (frameId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.EVALUATION_GET_SCREENSHOT, frameId)
  }
}

// =============================================================================
// CONTEXT BRIDGE EXPOSURE
// =============================================================================

/**
 * Expose APIs to the renderer process.
 *
 * Uses Electron's contextBridge when context isolation is enabled (recommended).
 * Falls back to direct window property assignment for legacy support.
 *
 * EXPOSED GLOBALS:
 * - window.electron : Electron toolkit API (clipboard, shell, etc.)
 * - window.api      : GUMBO application API (defined above)
 */
if (process.contextIsolated) {
  try {
    // Secure exposure via contextBridge
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error('Failed to expose APIs via contextBridge:', error)
  }
} else {
  // Legacy fallback (not recommended - less secure)
  // @ts-ignore (defined in d.ts)
  window.electron = electronAPI
  // @ts-ignore (defined in d.ts)
  window.api = api
}
