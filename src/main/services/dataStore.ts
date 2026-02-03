import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import type { AppState, Project, Suggestion, Chat, UserProposition, CustomizeAgentData, AppSettings, Message } from '../types'

// Default state when no persisted data exists
const getDefaultState = (): AppState => ({
  projects: [],
  suggestions: [],
  chats: [],
  userPropositions: [],
  agentConfig: {
    focusMoreOn: '',
    focusLessOn: '',
    style: ''
  },
  studyStatus: {
    status: 'active',
    endTime: Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days from now
  },
  settings: {
    notificationFrequency: 5,
    recordingEnabled: false,
    disablePopup: false
  },
  lastUpdateId: 0,
  lastProcessedTimestamp: Date.now()
})

class DataStore {
  private state: AppState
  private dataDir: string
  private stateFilePath: string
  private saveTimeout: NodeJS.Timeout | null = null
  private readonly SAVE_DEBOUNCE_MS = 1000
  private updateListeners: Set<(state: AppState) => void> = new Set()

  constructor() {
    this.dataDir = path.join(app.getPath('userData'), 'data')
    this.stateFilePath = path.join(this.dataDir, 'state.json')
    this.state = getDefaultState()
  }

  async initialize(): Promise<void> {
    // Ensure data directory exists
    await this.ensureDataDir()

    // Load persisted state
    await this.load()
  }

  private async ensureDataDir(): Promise<void> {
    try {
      await fs.promises.mkdir(this.dataDir, { recursive: true })
      // Also create screenshots directory
      await fs.promises.mkdir(path.join(this.dataDir, 'screenshots'), { recursive: true })
    } catch (error) {
      console.error('Failed to create data directory:', error)
    }
  }

  async load(): Promise<AppState> {
    try {
      const data = await fs.promises.readFile(this.stateFilePath, 'utf-8')
      const parsed = JSON.parse(data) as AppState
      this.state = { ...getDefaultState(), ...parsed }
      console.log('State loaded from disk')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        console.log('No persisted state found, using defaults')
        this.state = getDefaultState()
      } else {
        console.error('Failed to load state:', error)
        this.state = getDefaultState()
      }
    }
    return this.state
  }

  async save(): Promise<void> {
    try {
      const tempPath = this.stateFilePath + '.tmp'
      const data = JSON.stringify(this.state, null, 2)

      // Atomic write: write to temp file, then rename
      await fs.promises.writeFile(tempPath, data, 'utf-8')
      await fs.promises.rename(tempPath, this.stateFilePath)

      console.log('State saved to disk')
    } catch (error) {
      console.error('Failed to save state:', error)
    }
  }

  private scheduleSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout)
    }
    this.saveTimeout = setTimeout(() => {
      this.save()
      this.saveTimeout = null
    }, this.SAVE_DEBOUNCE_MS)
  }

  private notifyListeners(): void {
    for (const listener of this.updateListeners) {
      try {
        listener(this.state)
      } catch (error) {
        console.error('Error in state update listener:', error)
      }
    }
  }

  getState(): AppState {
    return this.state
  }

  updateState(updates: Partial<AppState>): void {
    this.state = { ...this.state, ...updates }
    this.state.lastUpdateId++
    this.state.lastProcessedTimestamp = Date.now()
    this.scheduleSave()
    this.notifyListeners()
  }

  onStateUpdate(listener: (state: AppState) => void): () => void {
    this.updateListeners.add(listener)
    return () => this.updateListeners.delete(listener)
  }

  // Force save immediately (for app quit)
  async forceSave(): Promise<void> {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout)
      this.saveTimeout = null
    }
    await this.save()
  }

  getDataDir(): string {
    return this.dataDir
  }

  getScreenshotsDir(): string {
    return path.join(this.dataDir, 'screenshots')
  }

  // Suggestion operations
  getSuggestions(): Suggestion[] {
    return this.state.suggestions
  }

  getActiveSuggestions(): Suggestion[] {
    return this.state.suggestions.filter(s => s.status === 'active')
  }

  getSuggestionById(id: string): Suggestion | undefined {
    return this.state.suggestions.find(s => s.suggestionId === id)
  }

  updateSuggestion(id: string, updates: Partial<Suggestion>): void {
    const index = this.state.suggestions.findIndex(s => s.suggestionId === id)
    if (index !== -1) {
      this.state.suggestions[index] = { ...this.state.suggestions[index], ...updates, updatedAt: Date.now() }
      this.updateState({ suggestions: [...this.state.suggestions] })
    }
  }

  addSuggestion(suggestion: Suggestion): void {
    this.updateState({ suggestions: [...this.state.suggestions, suggestion] })
  }

  dismissSuggestion(id: string): void {
    this.updateSuggestion(id, { status: 'closed', closedAt: Date.now() })
  }

  completeSuggestion(id: string): void {
    this.updateSuggestion(id, { status: 'complete', closedAt: Date.now() })
  }

  // Project operations
  getProjects(): Project[] {
    return this.state.projects
  }

  getActiveProjects(): Project[] {
    return this.state.projects.filter(p => p.status === 'active')
  }

  getProjectById(id: number): Project | undefined {
    return this.state.projects.find(p => p.projectId === id)
  }

  updateProject(id: number, updates: Partial<Project>): void {
    const index = this.state.projects.findIndex(p => p.projectId === id)
    if (index !== -1) {
      this.state.projects[index] = { ...this.state.projects[index], ...updates }
      this.updateState({ projects: [...this.state.projects] })
    }
  }

  addProject(project: Project): void {
    this.updateState({ projects: [...this.state.projects, project] })
  }

  deleteProject(id: number): void {
    this.updateProject(id, { status: 'deleted', closedAt: Date.now() })
  }

  // Chat operations
  getChats(): Chat[] {
    return this.state.chats
  }

  getChatById(id: string): Chat | undefined {
    return this.state.chats.find(c => c.id === id)
  }

  createChat(chat: Chat): void {
    // Prepend to maintain same order as frontend (newest first)
    this.updateState({ chats: [chat, ...this.state.chats] })
  }

  updateChat(id: string, updates: Partial<Chat>): void {
    const index = this.state.chats.findIndex(c => c.id === id)
    if (index !== -1) {
      this.state.chats[index] = { ...this.state.chats[index], ...updates }
      this.updateState({ chats: [...this.state.chats] })
    }
  }

  addMessage(chatId: string, message: Message): void {
    const chat = this.getChatById(chatId)
    if (chat) {
      this.updateChat(chatId, { messages: [...chat.messages, message] })
    }
  }

  updateMessage(chatId: string, messageId: string, updates: Partial<Message>): void {
    const chat = this.getChatById(chatId)
    if (chat) {
      const messages = chat.messages.map(m =>
        m.id === messageId ? { ...m, ...updates } : m
      )
      this.updateChat(chatId, { messages })
    }
  }

  // User proposition operations
  getPropositions(): UserProposition[] {
    return this.state.userPropositions
  }

  addProposition(proposition: UserProposition): void {
    this.updateState({ userPropositions: [...this.state.userPropositions, proposition] })
  }

  updateProposition(id: string, text: string): void {
    const index = this.state.userPropositions.findIndex(p => p.id === id)
    if (index !== -1) {
      const proposition = this.state.userPropositions[index]
      this.state.userPropositions[index] = {
        ...proposition,
        text,
        editHistory: [...proposition.editHistory, proposition.text]
      }
      this.updateState({ userPropositions: [...this.state.userPropositions] })
    }
  }

  deleteProposition(id: string): void {
    this.updateState({
      userPropositions: this.state.userPropositions.filter(p => p.id !== id)
    })
  }

  // Agent config operations
  getAgentConfig(): CustomizeAgentData {
    return this.state.agentConfig
  }

  updateAgentConfig(updates: Partial<CustomizeAgentData>): void {
    this.updateState({ agentConfig: { ...this.state.agentConfig, ...updates } })
  }

  // Settings operations
  getSettings(): AppSettings {
    return this.state.settings
  }

  updateSettings(updates: Partial<AppSettings>): void {
    this.updateState({ settings: { ...this.state.settings, ...updates } })
  }
}

// Singleton instance
export const dataStore = new DataStore()
