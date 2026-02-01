import { useCallback, useEffect, useRef } from 'react'
import { useData } from '../context/DataContext'
import { useNavigation } from '../context/NavigationContext'
import type { Chat, Message, Suggestion } from '../types'

// Check if running in Electron with API available
const hasElectronAPI = (): boolean => {
  return typeof window !== 'undefined' && window.api && typeof window.api.chats?.sendMessage === 'function'
}

interface UseChatReturn {
  chats: Chat[]
  recentChats: Chat[]
  getChat: (id: string) => Chat | undefined
  createChat: (options?: {
    title?: string
    initialPrompt?: string
    associatedProjectId?: number
    associatedSuggestionId?: string
  }) => string
  updateChat: (chatId: string, updates: Partial<Chat>) => void
  addMessage: (chatId: string, message: Omit<Message, 'id'>) => string
  updateMessage: (chatId: string, messageId: string, updates: Partial<Message>) => void
  sendMessage: (chatId: string, content: string) => void
  openChatForSuggestion: (suggestion: Suggestion) => void
  createNewChat: () => void
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export function useChat(): UseChatReturn {
  const { state, dispatch, getChatById, getRecentChats, syncToBackend } = useData()
  const { openChat } = useNavigation()
  const streamingMessageIdRef = useRef<Map<string, string>>(new Map())

  // Set up streaming listener
  useEffect(() => {
    if (!hasElectronAPI()) return

    const unsubscribe = window.api.chats.onStreamChunk(
      (data: { chatId: string; chunk: string }) => {
        const { chatId, chunk } = data
        const messageId = streamingMessageIdRef.current.get(chatId)

        if (messageId) {
          // Get current message content and append chunk
          const chat = getChatById(chatId)
          const message = chat?.messages.find((m) => m.id === messageId)
          const currentContent = message?.content || ''

          dispatch({
            type: 'UPDATE_MESSAGE',
            payload: {
              chatId,
              messageId,
              updates: { content: currentContent + chunk, isPlaceholder: false }
            }
          })
        }
      }
    )

    return () => {
      unsubscribe()
    }
  }, [dispatch, getChatById])

  const createChat = useCallback(
    (options?: {
      title?: string
      initialPrompt?: string
      associatedProjectId?: number
      associatedSuggestionId?: string
    }) => {
      const chatId = `chat-${generateId()}`
      const newChat: Chat = {
        id: chatId,
        title: options?.title || 'New Chat',
        messages: [],
        hasReceivedInitialResponse: false,
        isLoadingResponse: false,
        initialPrompt: options?.initialPrompt,
        associatedProjectId: options?.associatedProjectId,
        associatedSuggestionId: options?.associatedSuggestionId,
        createdAt: Date.now(),
        status: 'active'
      }

      dispatch({ type: 'CREATE_CHAT', payload: newChat })
      syncToBackend({ type: 'CREATE_CHAT', payload: newChat })
      return chatId
    },
    [dispatch, syncToBackend]
  )

  const updateChat = useCallback(
    (chatId: string, updates: Partial<Chat>) => {
      dispatch({ type: 'UPDATE_CHAT', payload: { chatId, updates } })
    },
    [dispatch]
  )

  const addMessage = useCallback(
    (chatId: string, message: Omit<Message, 'id'>) => {
      const messageId = `msg-${generateId()}`
      const fullMessage: Message = {
        ...message,
        id: messageId
      }
      dispatch({ type: 'ADD_MESSAGE', payload: { chatId, message: fullMessage } })
      syncToBackend({ type: 'ADD_MESSAGE', payload: { chatId, message: fullMessage } })
      return messageId
    },
    [dispatch, syncToBackend]
  )

  const updateMessage = useCallback(
    (chatId: string, messageId: string, updates: Partial<Message>) => {
      dispatch({ type: 'UPDATE_MESSAGE', payload: { chatId, messageId, updates } })
      syncToBackend({ type: 'UPDATE_MESSAGE', payload: { chatId, messageId, updates } })
    },
    [dispatch, syncToBackend]
  )

  const simulateResponse = useCallback(
    (chatId: string) => {
      // Add placeholder message
      const placeholderId = addMessage(chatId, {
        role: 'assistant',
        content: '',
        isPlaceholder: true,
        isError: false
      })

      dispatch({
        type: 'UPDATE_CHAT',
        payload: { chatId, updates: { isLoadingResponse: true } }
      })

      // Simulate streaming delay
      const responses = [
        "I understand you're asking about this topic. Let me help you with that.",
        "Based on your question, here are some key points to consider:\n\n1. **First consideration** - This is an important aspect to keep in mind.\n\n2. **Second point** - This builds on the first idea.\n\n3. **Finally** - Here's a practical suggestion.",
        "I'd be happy to help you explore this further. What specific aspect would you like to dive deeper into?"
      ]
      const randomResponse = responses[Math.floor(Math.random() * responses.length)]

      // Simulate typing delay
      setTimeout(
        () => {
          updateMessage(chatId, placeholderId, {
            content: randomResponse,
            isPlaceholder: false
          })
          dispatch({
            type: 'UPDATE_CHAT',
            payload: {
              chatId,
              updates: { isLoadingResponse: false, hasReceivedInitialResponse: true }
            }
          })
        },
        1500 + Math.random() * 1000
      )
    },
    [addMessage, updateMessage, dispatch]
  )

  const sendMessageWithAPI = useCallback(
    async (chatId: string, content: string) => {
      if (!content.trim()) return

      // Add user message
      addMessage(chatId, {
        role: 'user',
        content: content.trim(),
        isPlaceholder: false,
        isError: false
      })

      // Add placeholder for assistant response
      const placeholderId = `msg-${generateId()}`
      const placeholderMessage: Message = {
        id: placeholderId,
        role: 'assistant',
        content: '',
        isPlaceholder: true,
        isError: false
      }
      dispatch({ type: 'ADD_MESSAGE', payload: { chatId, message: placeholderMessage } })
      syncToBackend({ type: 'ADD_MESSAGE', payload: { chatId, message: placeholderMessage } })

      // Track the placeholder for streaming updates
      streamingMessageIdRef.current.set(chatId, placeholderId)

      dispatch({
        type: 'UPDATE_CHAT',
        payload: { chatId, updates: { isLoadingResponse: true } }
      })

      try {
        await window.api.chats.sendMessage(chatId, content.trim())

        // Clean up tracking
        streamingMessageIdRef.current.delete(chatId)

        dispatch({
          type: 'UPDATE_CHAT',
          payload: {
            chatId,
            updates: { isLoadingResponse: false, hasReceivedInitialResponse: true }
          }
        })
      } catch (error) {
        console.error('Failed to send message:', error)

        // Update placeholder with error
        updateMessage(chatId, placeholderId, {
          content: 'Sorry, there was an error processing your message. Please try again.',
          isPlaceholder: false,
          isError: true
        })

        streamingMessageIdRef.current.delete(chatId)

        dispatch({
          type: 'UPDATE_CHAT',
          payload: { chatId, updates: { isLoadingResponse: false } }
        })
      }
    },
    [addMessage, updateMessage, dispatch, syncToBackend]
  )

  const sendMessage = useCallback(
    (chatId: string, content: string) => {
      if (!content.trim()) return

      if (hasElectronAPI()) {
        sendMessageWithAPI(chatId, content)
      } else {
        // Fallback to simulated response
        addMessage(chatId, {
          role: 'user',
          content: content.trim(),
          isPlaceholder: false,
          isError: false
        })
        simulateResponse(chatId)
      }
    },
    [addMessage, simulateResponse, sendMessageWithAPI]
  )

  const openChatForSuggestion = useCallback(
    (suggestion: Suggestion) => {
      // Check if chat already exists for this suggestion
      const existingChat = state.chats.find(
        (c) => c.associatedSuggestionId === suggestion.suggestionId
      )

      if (existingChat) {
        openChat(existingChat.id)
        return
      }

      // Create new chat
      const chatId = createChat({
        title: suggestion.title,
        initialPrompt: suggestion.initialPrompt,
        associatedProjectId: suggestion.projectId,
        associatedSuggestionId: suggestion.suggestionId
      })

      // Add initial prompt message if exists
      if (suggestion.initialPrompt) {
        addMessage(chatId, {
          role: 'prompt',
          content: suggestion.initialPrompt,
          isPlaceholder: false,
          isError: false
        })
      }

      // Add execution output if exists
      if (suggestion.executionOutput) {
        addMessage(chatId, {
          role: 'assistant',
          content: suggestion.executionOutput,
          isPlaceholder: false,
          isError: false
        })
      }

      openChat(chatId)
    },
    [state.chats, createChat, addMessage, openChat]
  )

  const createNewChat = useCallback(() => {
    const chatId = createChat({ title: 'New Chat' })
    openChat(chatId)
  }, [createChat, openChat])

  return {
    chats: state.chats,
    recentChats: getRecentChats(),
    getChat: getChatById,
    createChat,
    updateChat,
    addMessage,
    updateMessage,
    sendMessage,
    openChatForSuggestion,
    createNewChat
  }
}
