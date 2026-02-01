import { ipcMain, BrowserWindow } from 'electron'
import { dataStore } from '../services/dataStore'
import { chatService } from '../services/chatService'
import { IPC_CHANNELS, Chat, Message } from '../types'

export function registerChatHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.CHATS_GET_ALL, () => {
    return dataStore.getChats()
  })

  ipcMain.handle(IPC_CHANNELS.CHATS_GET, (_event, id: string) => {
    return dataStore.getChatById(id)
  })

  ipcMain.handle(IPC_CHANNELS.CHATS_CREATE, (_event, chatData: Chat) => {
    dataStore.createChat(chatData)
    return chatData
  })

  ipcMain.handle(
    IPC_CHANNELS.CHATS_ADD_MESSAGE,
    (_event, chatId: string, message: Message) => {
      dataStore.addMessage(chatId, message)
      return message
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.CHATS_UPDATE_MESSAGE,
    (_event, chatId: string, messageId: string, updates: Partial<Message>) => {
      dataStore.updateMessage(chatId, messageId, updates)
      return { success: true }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.CHATS_SEND_MESSAGE,
    async (event, chatId: string, content: string) => {
      const chat = dataStore.getChatById(chatId)
      if (!chat) {
        throw new Error(`Chat ${chatId} not found`)
      }

      // Mark chat as loading
      dataStore.updateChat(chatId, { isLoadingResponse: true })

      // Get the sender's webContents for streaming
      const webContents = event.sender
      const window = BrowserWindow.fromWebContents(webContents)

      try {
        // Generate response using chat service
        await chatService.generateResponse(
          chat,
          content,
          // Stream callback - send chunks to renderer
          (chunk: string) => {
            if (window && !window.isDestroyed()) {
              webContents.send(IPC_CHANNELS.CHATS_STREAM_CHUNK, { chatId, chunk })
            }
          }
        )

        dataStore.updateChat(chatId, {
          isLoadingResponse: false,
          hasReceivedInitialResponse: true
        })

        return { success: true }
      } catch (error) {
        dataStore.updateChat(chatId, { isLoadingResponse: false })
        throw error
      }
    }
  )
}
