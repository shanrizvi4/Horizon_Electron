import { ipcMain } from 'electron'
import { dataStore } from '../services/dataStore'
import { IPC_CHANNELS, AppSettings, CustomizeAgentData } from '../types'

export function registerSettingsHandlers(): void {
  // App Settings
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, () => {
    return dataStore.getSettings()
  })

  ipcMain.handle(
    IPC_CHANNELS.SETTINGS_UPDATE,
    (_event, updates: Partial<AppSettings>) => {
      dataStore.updateSettings(updates)
      return { success: true }
    }
  )

  // Agent Config
  ipcMain.handle(IPC_CHANNELS.AGENT_CONFIG_GET, () => {
    return dataStore.getAgentConfig()
  })

  ipcMain.handle(
    IPC_CHANNELS.AGENT_CONFIG_UPDATE,
    (_event, updates: Partial<CustomizeAgentData>) => {
      dataStore.updateAgentConfig(updates)
      return { success: true }
    }
  )
}
