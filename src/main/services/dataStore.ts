/**
 * =============================================================================
 * DATA STORE SERVICE
 * =============================================================================
 *
 * Central state management for the GUMBO Electron application.
 *
 * RESPONSIBILITIES:
 * - Persists application state to disk (JSON file)
 * - Provides CRUD operations for all data types
 * - Notifies listeners when state changes (for multi-window sync)
 * - Implements debounced saving to prevent excessive disk writes
 *
 * DATA FLOW:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  IPC Handlers / Services                                                │
 * │         │                                                               │
 * │         ▼                                                               │
 * │  ┌─────────────┐     ┌─────────────┐     ┌─────────────────────────┐   │
 * │  │ dataStore   │ ──► │  Listeners  │ ──► │ state:onUpdate (IPC)   │   │
 * │  │ .updateX()  │     │  (notify)   │     │ broadcasts to windows  │   │
 * │  └─────────────┘     └─────────────┘     └─────────────────────────┘   │
 * │         │                                                               │
 * │         ▼                                                               │
 * │  ┌─────────────────────────────────────────────────────────────────┐   │
 * │  │  Debounced Save (1s delay) ──► state.json                       │   │
 * │  └─────────────────────────────────────────────────────────────────┘   │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * PERSISTENCE:
 * - State saved to: <projectRoot>/data/state.json
 * - Screenshots saved to: <projectRoot>/data/screenshots/
 * - Uses atomic writes (temp file + rename) to prevent corruption
 *
 * @module services/dataStore
 */

import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import type {
  AppState,
  Project,
  Suggestion,
  Chat,
  UserProposition,
  CustomizeAgentData,
  AppSettings,
  Message
} from '../types'

// =============================================================================
// DEFAULT STATE
// =============================================================================

/**
 * Creates the default application state.
 * Used when no persisted state exists or when state file is corrupted.
 */
const getDefaultState = (): AppState => ({
  // Core data collections
  projects: [],
  suggestions: [],
  chats: [],
  userPropositions: [],

  // Agent customization settings
  agentConfig: {
    focusMoreOn: '',
    focusLessOn: '',
    style: ''
  },

  // Study tracking (for research purposes)
  studyStatus: {
    status: 'active',
    endTime: Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days from now
  },

  // User preferences
  settings: {
    notificationFrequency: 5, // 1-10 scale
    recordingEnabled: false, // Default OFF - user must explicitly enable
    disablePopup: false,
    hasCompletedOnboarding: false, // Show onboarding on first launch
    onboardingCompletedAt: undefined
  },

  // Sync metadata
  lastUpdateId: 0, // Incremented on each state change
  lastProcessedTimestamp: Date.now() // For pipeline processing
})

// =============================================================================
// DATA DIRECTORY RESOLUTION
// =============================================================================

/**
 * Resolves the data directory path.
 *
 * In development: Uses <projectRoot>/data/
 * In production: Uses <userData>/data/ (~/Library/Application Support/<appName>/data/)
 *
 * This ensures data persists in the project folder during development
 * for easy inspection and debugging, while using the proper user data
 * directory in production (which is writable and persists across updates).
 */
function getProjectDataDir(): string {
  const isDev = !app.isPackaged

  if (isDev) {
    // Development: __dirname is in out/main, go up to project root
    return path.join(__dirname, '..', '..', 'data')
  } else {
    // Production: use user data directory (~/Library/Application Support/<appName>/)
    return path.join(app.getPath('userData'), 'data')
  }
}

// =============================================================================
// DATA STORE CLASS
// =============================================================================

/**
 * Singleton class managing all application state.
 *
 * USAGE:
 * ```typescript
 * import { dataStore } from './services/dataStore'
 *
 * // Read data
 * const suggestions = dataStore.getActiveSuggestions()
 *
 * // Update data (automatically saves and notifies listeners)
 * dataStore.updateSuggestion(id, { status: 'closed' })
 *
 * // Subscribe to changes
 * const unsubscribe = dataStore.onStateUpdate((newState) => {
 *   console.log('State changed:', newState)
 * })
 * ```
 */
class DataStore {
  // ---------------------------------------------------------------------------
  // Private State
  // ---------------------------------------------------------------------------

  /** Current application state */
  private state: AppState

  /** Absolute path to the data directory */
  private dataDir: string

  /** Absolute path to state.json file */
  private stateFilePath: string

  /** Pending save timeout (for debouncing) */
  private saveTimeout: NodeJS.Timeout | null = null

  /** Debounce delay for saving (prevents excessive disk writes) */
  private readonly SAVE_DEBOUNCE_MS = 1000

  /** Registered listeners for state changes */
  private updateListeners: Set<(state: AppState) => void> = new Set()

  // ---------------------------------------------------------------------------
  // Constructor
  // ---------------------------------------------------------------------------

  constructor() {
    this.dataDir = getProjectDataDir()
    this.stateFilePath = path.join(this.dataDir, 'state.json')
    this.state = getDefaultState()

    console.log(`DataStore initialized with dataDir: ${this.dataDir}`)
  }

  // ---------------------------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------------------------

  /**
   * Initializes the data store.
   * Must be called before using any other methods.
   *
   * - Creates data directories if they don't exist
   * - Loads persisted state from disk
   */
  async initialize(): Promise<void> {
    await this.ensureDataDir()
    await this.load()
  }

  /**
   * Creates required data directories.
   */
  private async ensureDataDir(): Promise<void> {
    try {
      // Create main data directory
      await fs.promises.mkdir(this.dataDir, { recursive: true })

      // Create screenshots subdirectory
      await fs.promises.mkdir(path.join(this.dataDir, 'screenshots'), { recursive: true })
    } catch (error) {
      console.error('Failed to create data directory:', error)
    }
  }

  // ---------------------------------------------------------------------------
  // Persistence: Load & Save
  // ---------------------------------------------------------------------------

  /**
   * Loads state from disk.
   * Falls back to default state if file doesn't exist or is corrupted.
   */
  async load(): Promise<AppState> {
    try {
      const data = await fs.promises.readFile(this.stateFilePath, 'utf-8')
      const parsed = JSON.parse(data) as AppState

      // Merge with defaults to handle schema migrations
      this.state = { ...getDefaultState(), ...parsed }
      console.log('State loaded from disk')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // File doesn't exist - this is expected on first run
        console.log('No persisted state found, using defaults')
        this.state = getDefaultState()
      } else {
        // Parse error or other issue
        console.error('Failed to load state:', error)
        this.state = getDefaultState()
      }
    }

    return this.state
  }

  /**
   * Saves state to disk using atomic write.
   *
   * Atomic write process:
   * 1. Write to temporary file (state.json.tmp)
   * 2. Rename temp file to actual file
   *
   * This prevents corruption if the app crashes during write.
   */
  async save(): Promise<void> {
    try {
      const tempPath = this.stateFilePath + '.tmp'
      const data = JSON.stringify(this.state, null, 2)

      // Atomic write: write to temp, then rename
      await fs.promises.writeFile(tempPath, data, 'utf-8')
      await fs.promises.rename(tempPath, this.stateFilePath)

      console.log('State saved to disk')
    } catch (error) {
      console.error('Failed to save state:', error)
    }
  }

  /**
   * Schedules a debounced save.
   * Called automatically after each state update.
   *
   * Debouncing prevents excessive disk writes when multiple
   * updates happen in quick succession.
   */
  private scheduleSave(): void {
    // Cancel any pending save
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout)
    }

    // Schedule new save after debounce delay
    this.saveTimeout = setTimeout(() => {
      this.save()
      this.saveTimeout = null
    }, this.SAVE_DEBOUNCE_MS)
  }

  /**
   * Forces an immediate save.
   * Used when app is quitting to ensure data is persisted.
   */
  async forceSave(): Promise<void> {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout)
      this.saveTimeout = null
    }
    await this.save()
  }

  // ---------------------------------------------------------------------------
  // Observer Pattern: State Change Notifications
  // ---------------------------------------------------------------------------

  /**
   * Notifies all registered listeners of state change.
   * Called automatically after each state update.
   */
  private notifyListeners(): void {
    for (const listener of this.updateListeners) {
      try {
        listener(this.state)
      } catch (error) {
        console.error('Error in state update listener:', error)
      }
    }
  }

  /**
   * Registers a listener for state changes.
   *
   * @param listener - Callback invoked when state changes
   * @returns Unsubscribe function
   *
   * @example
   * ```typescript
   * const unsubscribe = dataStore.onStateUpdate((state) => {
   *   // Broadcast to renderer windows
   *   webContents.send('state:onUpdate', state)
   * })
   *
   * // Later: stop listening
   * unsubscribe()
   * ```
   */
  onStateUpdate(listener: (state: AppState) => void): () => void {
    this.updateListeners.add(listener)
    return () => this.updateListeners.delete(listener)
  }

  // ---------------------------------------------------------------------------
  // State Access & Updates
  // ---------------------------------------------------------------------------

  /**
   * Returns the current state.
   * Note: Returns the actual object reference - do not mutate directly!
   */
  getState(): AppState {
    return this.state
  }

  /**
   * Updates state with partial changes.
   * Automatically increments lastUpdateId, schedules save, and notifies listeners.
   *
   * @param updates - Partial state object with fields to update
   */
  updateState(updates: Partial<AppState>): void {
    this.state = { ...this.state, ...updates }
    this.state.lastUpdateId++
    this.state.lastProcessedTimestamp = Date.now()

    this.scheduleSave()
    this.notifyListeners()
  }

  // ---------------------------------------------------------------------------
  // Path Getters
  // ---------------------------------------------------------------------------

  /** Returns the data directory path */
  getDataDir(): string {
    return this.dataDir
  }

  /** Returns the screenshots directory path */
  getScreenshotsDir(): string {
    return path.join(this.dataDir, 'screenshots')
  }

  // ---------------------------------------------------------------------------
  // SUGGESTION OPERATIONS
  // ---------------------------------------------------------------------------

  /** Returns all suggestions */
  getSuggestions(): Suggestion[] {
    return this.state.suggestions
  }

  /** Returns only active suggestions (not closed/completed) */
  getActiveSuggestions(): Suggestion[] {
    return this.state.suggestions.filter((s) => s.status === 'active')
  }

  /** Finds a suggestion by ID */
  getSuggestionById(id: string): Suggestion | undefined {
    return this.state.suggestions.find((s) => s.suggestionId === id)
  }

  /**
   * Updates a suggestion.
   * Automatically sets updatedAt timestamp.
   */
  updateSuggestion(id: string, updates: Partial<Suggestion>): void {
    const index = this.state.suggestions.findIndex((s) => s.suggestionId === id)
    if (index !== -1) {
      this.state.suggestions[index] = {
        ...this.state.suggestions[index],
        ...updates,
        updatedAt: Date.now()
      }
      this.updateState({ suggestions: [...this.state.suggestions] })
    }
  }

  /** Adds a new suggestion */
  addSuggestion(suggestion: Suggestion): void {
    this.updateState({ suggestions: [...this.state.suggestions, suggestion] })
  }

  /** Dismisses a suggestion (sets status to 'closed') */
  dismissSuggestion(id: string): void {
    this.updateSuggestion(id, { status: 'closed', closedAt: Date.now() })
  }

  /** Completes a suggestion (sets status to 'complete') */
  completeSuggestion(id: string): void {
    this.updateSuggestion(id, { status: 'complete', closedAt: Date.now() })
  }

  // ---------------------------------------------------------------------------
  // PROJECT OPERATIONS
  // ---------------------------------------------------------------------------

  /** Returns all projects */
  getProjects(): Project[] {
    return this.state.projects
  }

  /** Returns only active projects (not deleted) */
  getActiveProjects(): Project[] {
    return this.state.projects.filter((p) => p.status === 'active')
  }

  /** Finds a project by ID */
  getProjectById(id: number): Project | undefined {
    return this.state.projects.find((p) => p.projectId === id)
  }

  /** Updates a project */
  updateProject(id: number, updates: Partial<Project>): void {
    const index = this.state.projects.findIndex((p) => p.projectId === id)
    if (index !== -1) {
      this.state.projects[index] = { ...this.state.projects[index], ...updates }
      this.updateState({ projects: [...this.state.projects] })
    }
  }

  /** Adds a new project */
  addProject(project: Project): void {
    this.updateState({ projects: [...this.state.projects, project] })
  }

  /** Soft-deletes a project (sets status to 'deleted') */
  deleteProject(id: number): void {
    this.updateProject(id, { status: 'deleted', closedAt: Date.now() })
  }

  // ---------------------------------------------------------------------------
  // CHAT OPERATIONS
  // ---------------------------------------------------------------------------

  /** Returns all chats */
  getChats(): Chat[] {
    return this.state.chats
  }

  /** Finds a chat by ID */
  getChatById(id: string): Chat | undefined {
    return this.state.chats.find((c) => c.id === id)
  }

  /**
   * Creates a new chat.
   * Prepends to maintain newest-first order.
   */
  createChat(chat: Chat): void {
    this.updateState({ chats: [chat, ...this.state.chats] })
  }

  /** Updates a chat */
  updateChat(id: string, updates: Partial<Chat>): void {
    const index = this.state.chats.findIndex((c) => c.id === id)
    if (index !== -1) {
      this.state.chats[index] = { ...this.state.chats[index], ...updates }
      this.updateState({ chats: [...this.state.chats] })
    }
  }

  /** Adds a message to a chat */
  addMessage(chatId: string, message: Message): void {
    const chat = this.getChatById(chatId)
    if (chat) {
      this.updateChat(chatId, { messages: [...chat.messages, message] })
    }
  }

  /**
   * Updates a specific message in a chat.
   * Used for streaming responses (updating placeholder message content).
   */
  updateMessage(chatId: string, messageId: string, updates: Partial<Message>): void {
    const chat = this.getChatById(chatId)
    if (chat) {
      const messages = chat.messages.map((m) => (m.id === messageId ? { ...m, ...updates } : m))
      this.updateChat(chatId, { messages })
    }
  }

  // ---------------------------------------------------------------------------
  // USER PROPOSITION OPERATIONS
  // ---------------------------------------------------------------------------

  /** Returns all user propositions (memories/preferences) */
  getPropositions(): UserProposition[] {
    return this.state.userPropositions
  }

  /** Adds a new proposition */
  addProposition(proposition: UserProposition): void {
    this.updateState({ userPropositions: [...this.state.userPropositions, proposition] })
  }

  /**
   * Updates a proposition's text.
   * Preserves edit history for potential undo/audit.
   */
  updateProposition(id: string, text: string): void {
    const index = this.state.userPropositions.findIndex((p) => p.id === id)
    if (index !== -1) {
      const proposition = this.state.userPropositions[index]
      this.state.userPropositions[index] = {
        ...proposition,
        text,
        editHistory: [...proposition.editHistory, proposition.text] // Save previous text
      }
      this.updateState({ userPropositions: [...this.state.userPropositions] })
    }
  }

  /** Deletes a proposition */
  deleteProposition(id: string): void {
    this.updateState({
      userPropositions: this.state.userPropositions.filter((p) => p.id !== id)
    })
  }

  // ---------------------------------------------------------------------------
  // AGENT CONFIG OPERATIONS
  // ---------------------------------------------------------------------------

  /** Returns current agent customization config */
  getAgentConfig(): CustomizeAgentData {
    return this.state.agentConfig
  }

  /** Updates agent customization config */
  updateAgentConfig(updates: Partial<CustomizeAgentData>): void {
    this.updateState({ agentConfig: { ...this.state.agentConfig, ...updates } })
  }

  // ---------------------------------------------------------------------------
  // SETTINGS OPERATIONS
  // ---------------------------------------------------------------------------

  /** Returns current app settings */
  getSettings(): AppSettings {
    return this.state.settings
  }

  /** Updates app settings */
  updateSettings(updates: Partial<AppSettings>): void {
    this.updateState({ settings: { ...this.state.settings, ...updates } })
  }

  // ---------------------------------------------------------------------------
  // PIPELINE DATA CLEANUP
  // ---------------------------------------------------------------------------

  /**
   * Clears all pipeline data to start fresh.
   * Removes all files from: screenshots, frame_analysis, concentration_gate,
   * suggestion_generation, scoring_filtering, deduplication.
   * Also clears suggestions from state.
   */
  async clearPipelineData(): Promise<void> {
    console.log('Clearing all pipeline data...')

    const folders = [
      'screenshots',
      'frame_analysis',
      'concentration_gate',
      'suggestion_generation',
      'scoring_filtering',
      'deduplication'
    ]

    for (const folder of folders) {
      const folderPath = path.join(this.dataDir, folder)
      try {
        const files = await fs.promises.readdir(folderPath)
        for (const file of files) {
          if (file.startsWith('.')) continue // Skip hidden files like .DS_Store
          await fs.promises.unlink(path.join(folderPath, file))
        }
        console.log(`Cleared ${files.length} files from ${folder}`)
      } catch (error) {
        console.log(`Could not clear ${folder}:`, error)
      }
    }

    // Clear suggestions from state
    this.updateState({
      suggestions: [],
      chats: [],
      lastProcessedTimestamp: 0
    })

    console.log('Pipeline data cleared')
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

/**
 * Singleton instance of the DataStore.
 *
 * IMPORTANT: Call `dataStore.initialize()` before using other methods.
 *
 * @example
 * ```typescript
 * import { dataStore } from './services/dataStore'
 *
 * // In app initialization
 * await dataStore.initialize()
 *
 * // Then use throughout the app
 * const suggestions = dataStore.getActiveSuggestions()
 * ```
 */
export const dataStore = new DataStore()
