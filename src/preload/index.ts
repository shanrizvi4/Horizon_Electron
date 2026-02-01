import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// IPC channel names (must match main process)
const IPC_CHANNELS = {
  SUGGESTIONS_GET_ALL: 'suggestions:getAll',
  SUGGESTIONS_GET_ACTIVE: 'suggestions:getActive',
  SUGGESTIONS_UPDATE: 'suggestions:update',
  SUGGESTIONS_DISMISS: 'suggestions:dismiss',
  SUGGESTIONS_COMPLETE: 'suggestions:complete',
  PROJECTS_GET_ALL: 'projects:getAll',
  PROJECTS_GET_ACTIVE: 'projects:getActive',
  PROJECTS_UPDATE: 'projects:update',
  PROJECTS_DELETE: 'projects:delete',
  CHATS_GET_ALL: 'chats:getAll',
  CHATS_GET: 'chats:get',
  CHATS_CREATE: 'chats:create',
  CHATS_ADD_MESSAGE: 'chats:addMessage',
  CHATS_UPDATE_MESSAGE: 'chats:updateMessage',
  CHATS_SEND_MESSAGE: 'chats:sendMessage',
  CHATS_STREAM_CHUNK: 'chats:streamChunk',
  USER_MODEL_GET_PROPOSITIONS: 'userModel:getPropositions',
  USER_MODEL_ADD: 'userModel:add',
  USER_MODEL_UPDATE: 'userModel:update',
  USER_MODEL_DELETE: 'userModel:delete',
  AGENT_CONFIG_GET: 'agentConfig:get',
  AGENT_CONFIG_UPDATE: 'agentConfig:update',
  SETTINGS_GET: 'settings:get',
  SETTINGS_UPDATE: 'settings:update',
  RECORDING_START: 'recording:start',
  RECORDING_STOP: 'recording:stop',
  RECORDING_GET_STATUS: 'recording:getStatus',
  RECORDING_STATUS_CHANGE: 'recording:statusChange',
  STATE_GET_ALL: 'state:getAll',
  STATE_SUBSCRIBE: 'state:subscribe',
  STATE_ON_UPDATE: 'state:onUpdate',
  // Popup
  POPUP_SHOW: 'popup:show',
  POPUP_HIDE: 'popup:hide',
  POPUP_RESIZE: 'popup:resize',
  POPUP_OPEN_MAIN_APP: 'popup:openMainApp',
  POPUP_NAVIGATE_TO_CHAT: 'popup:navigateToChat',
  POPUP_DISABLE_AUTO_CLOSE: 'popup:disableAutoClose',
  POPUP_VISIBILITY_CHANGE: 'popup:visibilityChange'
} as const

// Custom APIs for renderer
const api = {
  suggestions: {
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.SUGGESTIONS_GET_ALL),
    getActive: () => ipcRenderer.invoke(IPC_CHANNELS.SUGGESTIONS_GET_ACTIVE),
    update: (id: string, data: unknown) =>
      ipcRenderer.invoke(IPC_CHANNELS.SUGGESTIONS_UPDATE, id, data),
    dismiss: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.SUGGESTIONS_DISMISS, id),
    complete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.SUGGESTIONS_COMPLETE, id)
  },

  projects: {
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.PROJECTS_GET_ALL),
    getActive: () => ipcRenderer.invoke(IPC_CHANNELS.PROJECTS_GET_ACTIVE),
    update: (id: number, data: unknown) =>
      ipcRenderer.invoke(IPC_CHANNELS.PROJECTS_UPDATE, id, data),
    delete: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.PROJECTS_DELETE, id)
  },

  chats: {
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.CHATS_GET_ALL),
    get: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.CHATS_GET, id),
    create: (data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.CHATS_CREATE, data),
    addMessage: (chatId: string, message: unknown) =>
      ipcRenderer.invoke(IPC_CHANNELS.CHATS_ADD_MESSAGE, chatId, message),
    updateMessage: (chatId: string, messageId: string, updates: unknown) =>
      ipcRenderer.invoke(IPC_CHANNELS.CHATS_UPDATE_MESSAGE, chatId, messageId, updates),
    sendMessage: (chatId: string, content: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.CHATS_SEND_MESSAGE, chatId, content),
    onStreamChunk: (callback: (data: { chatId: string; chunk: string }) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, data: { chatId: string; chunk: string }) => {
        callback(data)
      }
      ipcRenderer.on(IPC_CHANNELS.CHATS_STREAM_CHUNK, listener)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.CHATS_STREAM_CHUNK, listener)
    }
  },

  userModel: {
    getPropositions: () => ipcRenderer.invoke(IPC_CHANNELS.USER_MODEL_GET_PROPOSITIONS),
    add: (text: string) => ipcRenderer.invoke(IPC_CHANNELS.USER_MODEL_ADD, text),
    update: (id: string, text: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.USER_MODEL_UPDATE, id, text),
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.USER_MODEL_DELETE, id)
  },

  agentConfig: {
    get: () => ipcRenderer.invoke(IPC_CHANNELS.AGENT_CONFIG_GET),
    update: (data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.AGENT_CONFIG_UPDATE, data)
  },

  settings: {
    get: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET),
    update: (data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_UPDATE, data)
  },

  recording: {
    start: () => ipcRenderer.invoke(IPC_CHANNELS.RECORDING_START),
    stop: () => ipcRenderer.invoke(IPC_CHANNELS.RECORDING_STOP),
    getStatus: () => ipcRenderer.invoke(IPC_CHANNELS.RECORDING_GET_STATUS),
    onStatusChange: (callback: (isRecording: boolean) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, isRecording: boolean) => {
        callback(isRecording)
      }
      ipcRenderer.on(IPC_CHANNELS.RECORDING_STATUS_CHANGE, listener)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.RECORDING_STATUS_CHANGE, listener)
    }
  },

  state: {
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.STATE_GET_ALL),
    subscribe: () => ipcRenderer.invoke(IPC_CHANNELS.STATE_SUBSCRIBE),
    onUpdate: (callback: (state: unknown) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, state: unknown) => {
        callback(state)
      }
      ipcRenderer.on(IPC_CHANNELS.STATE_ON_UPDATE, listener)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.STATE_ON_UPDATE, listener)
    }
  },

  popup: {
    show: () => ipcRenderer.invoke(IPC_CHANNELS.POPUP_SHOW),
    hide: () => ipcRenderer.invoke(IPC_CHANNELS.POPUP_HIDE),
    resize: (width: number, height: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.POPUP_RESIZE, width, height),
    openMainApp: () => ipcRenderer.invoke(IPC_CHANNELS.POPUP_OPEN_MAIN_APP),
    navigateToChat: (chatId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.POPUP_NAVIGATE_TO_CHAT, chatId),
    disableAutoClose: (durationMs?: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.POPUP_DISABLE_AUTO_CLOSE, durationMs),
    onVisibilityChange: (callback: (visible: boolean) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, visible: boolean) => {
        callback(visible)
      }
      ipcRenderer.on(IPC_CHANNELS.POPUP_VISIBILITY_CHANGE, listener)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.POPUP_VISIBILITY_CHANGE, listener)
    }
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
