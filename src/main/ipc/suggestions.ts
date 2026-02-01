import { ipcMain } from 'electron'
import { dataStore } from '../services/dataStore'
import { IPC_CHANNELS, Suggestion } from '../types'

export function registerSuggestionHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.SUGGESTIONS_GET_ALL, () => {
    return dataStore.getSuggestions()
  })

  ipcMain.handle(IPC_CHANNELS.SUGGESTIONS_GET_ACTIVE, () => {
    return dataStore.getActiveSuggestions()
  })

  ipcMain.handle(
    IPC_CHANNELS.SUGGESTIONS_UPDATE,
    (_event, id: string, updates: Partial<Suggestion>) => {
      dataStore.updateSuggestion(id, updates)
      return { success: true }
    }
  )

  ipcMain.handle(IPC_CHANNELS.SUGGESTIONS_DISMISS, (_event, id: string) => {
    dataStore.dismissSuggestion(id)
    return { success: true }
  })

  ipcMain.handle(IPC_CHANNELS.SUGGESTIONS_COMPLETE, (_event, id: string) => {
    dataStore.completeSuggestion(id)
    return { success: true }
  })
}
