import { registerSuggestionHandlers } from './suggestions'
import { registerProjectHandlers } from './projects'
import { registerChatHandlers } from './chats'
import { registerUserModelHandlers } from './userModel'
import { registerSettingsHandlers } from './settings'
import { registerRecordingHandlers } from './recording'
import { registerStateHandlers } from './state'
import { registerPopupHandlers } from './popup'

export function registerAllIpcHandlers(): void {
  registerSuggestionHandlers()
  registerProjectHandlers()
  registerChatHandlers()
  registerUserModelHandlers()
  registerSettingsHandlers()
  registerRecordingHandlers()
  registerStateHandlers()
  registerPopupHandlers()

  console.log('All IPC handlers registered')
}
