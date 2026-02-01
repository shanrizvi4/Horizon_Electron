import { ipcMain } from 'electron'
import { dataStore } from '../services/dataStore'
import { IPC_CHANNELS, Project } from '../types'

export function registerProjectHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.PROJECTS_GET_ALL, () => {
    return dataStore.getProjects()
  })

  ipcMain.handle(IPC_CHANNELS.PROJECTS_GET_ACTIVE, () => {
    return dataStore.getActiveProjects()
  })

  ipcMain.handle(
    IPC_CHANNELS.PROJECTS_UPDATE,
    (_event, id: number, updates: Partial<Project>) => {
      dataStore.updateProject(id, updates)
      return { success: true }
    }
  )

  ipcMain.handle(IPC_CHANNELS.PROJECTS_DELETE, (_event, id: number) => {
    dataStore.deleteProject(id)
    return { success: true }
  })
}
