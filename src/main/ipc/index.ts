/**
 * =============================================================================
 * IPC HANDLER REGISTRATION
 * =============================================================================
 *
 * Central module for registering all IPC (Inter-Process Communication) handlers.
 * These handlers enable communication between the main process and renderer windows.
 *
 * IPC ARCHITECTURE:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  RENDERER (React Frontend)                                              │
 * │  ┌─────────────────────────────────────────────────────────────────┐   │
 * │  │  window.api.suggestions.getAll()                                │   │
 * │  │  window.api.chats.sendMessage()                                 │   │
 * │  │  window.api.recording.start()                                   │   │
 * │  └─────────────────────────────────────────────────────────────────┘   │
 * │                              │                                          │
 * │                    ipcRenderer.invoke() / on()                          │
 * └──────────────────────────────┼──────────────────────────────────────────┘
 *                                │
 *                         contextBridge
 *                                │
 * ┌──────────────────────────────┼──────────────────────────────────────────┐
 * │  PRELOAD (API Bridge)        │                                          │
 * │  ┌─────────────────────────────────────────────────────────────────┐   │
 * │  │  Exposes safe API to renderer via contextBridge                 │   │
 * │  └─────────────────────────────────────────────────────────────────┘   │
 * └──────────────────────────────┼──────────────────────────────────────────┘
 *                                │
 *                          ipcMain.handle()
 *                                │
 * ┌──────────────────────────────┼──────────────────────────────────────────┐
 * │  MAIN PROCESS                ▼                                          │
 * │  ┌─────────────────────────────────────────────────────────────────┐   │
 * │  │  IPC HANDLERS (this module)                                     │   │
 * │  │                                                                 │   │
 * │  │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────────┐   │   │
 * │  │  │suggestions│ │ projects  │ │   chats   │ │  userModel    │   │   │
 * │  │  └───────────┘ └───────────┘ └───────────┘ └───────────────┘   │   │
 * │  │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────────┐   │   │
 * │  │  │ settings  │ │ recording │ │   state   │ │    popup      │   │   │
 * │  │  └───────────┘ └───────────┘ └───────────┘ └───────────────┘   │   │
 * │  └─────────────────────────────────────────────────────────────────┘   │
 * │                              │                                          │
 * │                              ▼                                          │
 * │  ┌─────────────────────────────────────────────────────────────────┐   │
 * │  │  SERVICES (dataStore, chatService, screenCapture, etc.)         │   │
 * │  └─────────────────────────────────────────────────────────────────┘   │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * HANDLER MODULES:
 * - suggestions.ts  : CRUD for AI suggestions
 * - projects.ts     : CRUD for user projects
 * - chats.ts        : Chat creation and LLM messaging
 * - userModel.ts    : User propositions (memories/preferences)
 * - settings.ts     : App settings and agent config
 * - recording.ts    : Screen capture control
 * - state.ts        : Multi-window state synchronization
 * - popup.ts        : Popup window management
 *
 * @module ipc/index
 */

import { registerSuggestionHandlers } from './suggestions'
import { registerProjectHandlers } from './projects'
import { registerChatHandlers } from './chats'
import { registerUserModelHandlers } from './userModel'
import { registerSettingsHandlers } from './settings'
import { registerRecordingHandlers } from './recording'
import { registerStateHandlers } from './state'
import { registerPopupHandlers } from './popup'
import { registerPermissionsHandlers } from './permissions'
import { registerEvaluationHandlers } from '../../eval/main'

/**
 * Registers all IPC handlers for the application.
 *
 * MUST be called during app initialization, before any windows are created.
 *
 * @example
 * ```typescript
 * // In main/index.ts
 * app.whenReady().then(() => {
 *   registerAllIpcHandlers()
 *   createWindow()
 * })
 * ```
 */
export function registerAllIpcHandlers(): void {
  // Data management handlers
  registerSuggestionHandlers() // AI-generated suggestions
  registerProjectHandlers() // User projects
  registerChatHandlers() // Chat with LLM
  registerUserModelHandlers() // User preferences/memories

  // Configuration handlers
  registerSettingsHandlers() // App settings + agent config

  // Feature handlers
  registerRecordingHandlers() // Screen capture control

  // System handlers
  registerStateHandlers() // Multi-window state sync
  registerPopupHandlers() // Popup window management
  registerPermissionsHandlers() // macOS permissions

  // Evaluation handlers
  registerEvaluationHandlers() // Pipeline evaluation data

  console.log('All IPC handlers registered')
}
