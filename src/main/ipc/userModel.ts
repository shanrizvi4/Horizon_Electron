import { ipcMain } from 'electron'
import { dataStore } from '../services/dataStore'
import { IPC_CHANNELS, UserProposition } from '../types'

function generateId(): string {
  return `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export function registerUserModelHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.USER_MODEL_GET_PROPOSITIONS, () => {
    return dataStore.getPropositions()
  })

  ipcMain.handle(IPC_CHANNELS.USER_MODEL_ADD, (_event, text: string) => {
    const proposition: UserProposition = {
      id: generateId(),
      text,
      editHistory: []
    }
    dataStore.addProposition(proposition)
    return proposition
  })

  ipcMain.handle(
    IPC_CHANNELS.USER_MODEL_UPDATE,
    (_event, id: string, text: string) => {
      dataStore.updateProposition(id, text)
      return { success: true }
    }
  )

  ipcMain.handle(IPC_CHANNELS.USER_MODEL_DELETE, (_event, id: string) => {
    dataStore.deleteProposition(id)
    return { success: true }
  })
}
