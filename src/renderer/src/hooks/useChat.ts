/**
 * =============================================================================
 * USE CHAT HOOK
 * =============================================================================
 *
 * Custom React hook for chat functionality with LLM integration.
 * Handles chat creation, message management, and streaming responses.
 *
 * STREAMING ARCHITECTURE:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  Component calls sendMessage(chatId, content)                           │
 * │         │                                                               │
 * │         ▼                                                               │
 * │  ┌─────────────────────────────────────────────────────────────────┐   │
 * │  │  1. Add user message to local state                             │   │
 * │  │  2. Add placeholder assistant message (empty, isPlaceholder)    │   │
 * │  │  3. Track placeholder ID for streaming updates                  │   │
 * │  │  4. Call window.api.chats.sendMessage()                         │   │
 * │  └─────────────────────────────────────────────────────────────────┘   │
 * │                              │                                          │
 * │                              ▼                                          │
 * │  ┌─────────────────────────────────────────────────────────────────┐   │
 * │  │  Main Process: chatService.generateResponse()                   │   │
 * │  │  Streams response from Gemini API                               │   │
 * │  │  Each chunk → webContents.send('chats:streamChunk', ...)        │   │
 * │  └─────────────────────────────────────────────────────────────────┘   │
 * │                              │                                          │
 * │                              ▼                                          │
 * │  ┌─────────────────────────────────────────────────────────────────┐   │
 * │  │  onStreamChunk listener (set up in useEffect)                   │   │
 * │  │  - Receives { chatId, chunk }                                   │   │
 * │  │  - Looks up placeholder message ID                              │   │
 * │  │  - Appends chunk to message content                             │   │
 * │  │  - Dispatches UPDATE_MESSAGE action                             │   │
 * │  └─────────────────────────────────────────────────────────────────┘   │
 * │                              │                                          │
 * │                              ▼                                          │
 * │  ┌─────────────────────────────────────────────────────────────────┐   │
 * │  │  UI updates in real-time as chunks arrive                       │   │
 * │  │  When sendMessage() resolves, mark chat as not loading          │   │
 * │  └─────────────────────────────────────────────────────────────────┘   │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * FALLBACK:
 * When running outside Electron, uses simulated responses for demo purposes.
 *
 * @module hooks/useChat
 */

import { useCallback, useEffect, useRef } from 'react'
import { useData } from '../context/DataContext'
import { useNavigation } from '../context/NavigationContext'
import type { Chat, Message, Suggestion } from '../types'

// =============================================================================
// ENVIRONMENT DETECTION
// =============================================================================

/**
 * Checks if running in Electron with chat API available.
 *
 * @returns True if Electron chat API is available
 */
const hasElectronAPI = (): boolean => {
  return (
    typeof window !== 'undefined' &&
    window.api &&
    typeof window.api.chats?.sendMessage === 'function'
  )
}

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Return type of the useChat hook.
 */
interface UseChatReturn {
  /** All chats in the system */
  chats: Chat[]

  /** Recent chats (sorted by creation date) */
  recentChats: Chat[]

  /** Get a specific chat by ID */
  getChat: (id: string) => Chat | undefined

  /** Create a new chat (returns the chat ID) */
  createChat: (options?: {
    title?: string
    initialPrompt?: string
    associatedProjectId?: number
    associatedSuggestionId?: string
  }) => string

  /** Update chat properties */
  updateChat: (chatId: string, updates: Partial<Chat>) => void

  /** Add a message to a chat (returns the message ID) */
  addMessage: (chatId: string, message: Omit<Message, 'id'>) => string

  /** Update a specific message */
  updateMessage: (chatId: string, messageId: string, updates: Partial<Message>) => void

  /** Send a message and get LLM response */
  sendMessage: (chatId: string, content: string) => void

  /** Open or create a chat for a suggestion */
  openChatForSuggestion: (suggestion: Suggestion) => void

  /** Create a new empty chat and navigate to it */
  createNewChat: () => void
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Generates a unique ID for chats and messages.
 *
 * Format: <timestamp>-<random>
 * Example: 1706745600000-abc123def
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

/**
 * Hook for chat functionality with LLM integration.
 *
 * Provides methods to create chats, send messages, and receive
 * streaming responses from the LLM.
 *
 * @example
 * ```tsx
 * function ChatView({ chatId }) {
 *   const { getChat, sendMessage } = useChat()
 *   const chat = getChat(chatId)
 *
 *   const handleSend = (text: string) => {
 *     sendMessage(chatId, text)
 *   }
 *
 *   return (
 *     <div>
 *       {chat?.messages.map(m => <Message key={m.id} message={m} />)}
 *       <Input onSubmit={handleSend} />
 *     </div>
 *   )
 * }
 * ```
 */
export function useChat(): UseChatReturn {
  const { state, dispatch, getChatById, getRecentChats, syncToBackend } = useData()
  const { openChat } = useNavigation()

  /**
   * Maps chat IDs to their current streaming message placeholder ID.
   * Used to route incoming stream chunks to the correct message.
   */
  const streamingMessageIdRef = useRef<Map<string, string>>(new Map())

  // ---------------------------------------------------------------------------
  // Streaming Listener Setup
  // ---------------------------------------------------------------------------

  /**
   * Set up listener for streaming response chunks.
   *
   * When a chunk arrives, we find the placeholder message for that chat
   * and append the chunk to its content.
   */
  useEffect(() => {
    if (!hasElectronAPI()) return

    const unsubscribe = window.api.chats.onStreamChunk(
      (data: { chatId: string; chunk: string }) => {
        const { chatId, chunk } = data
        const messageId = streamingMessageIdRef.current.get(chatId)

        if (messageId) {
          // Get current message content and append the new chunk
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

    // Cleanup on unmount
    return () => {
      unsubscribe()
    }
  }, [dispatch, getChatById])

  // ---------------------------------------------------------------------------
  // Chat Creation
  // ---------------------------------------------------------------------------

  /**
   * Creates a new chat.
   *
   * @param options - Optional chat configuration
   * @returns The new chat's ID
   */
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

      // Update local state
      dispatch({ type: 'CREATE_CHAT', payload: newChat })

      // Sync to backend
      syncToBackend({ type: 'CREATE_CHAT', payload: newChat })

      return chatId
    },
    [dispatch, syncToBackend]
  )

  // ---------------------------------------------------------------------------
  // Chat Updates
  // ---------------------------------------------------------------------------

  /**
   * Updates properties on a chat.
   *
   * @param chatId - Chat to update
   * @param updates - Fields to update
   */
  const updateChat = useCallback(
    (chatId: string, updates: Partial<Chat>) => {
      dispatch({ type: 'UPDATE_CHAT', payload: { chatId, updates } })
    },
    [dispatch]
  )

  // ---------------------------------------------------------------------------
  // Message Management
  // ---------------------------------------------------------------------------

  /**
   * Adds a message to a chat.
   *
   * @param chatId - Chat to add message to
   * @param message - Message content (ID is auto-generated)
   * @returns The new message's ID
   */
  const addMessage = useCallback(
    (chatId: string, message: Omit<Message, 'id'>) => {
      const messageId = `msg-${generateId()}`
      const fullMessage: Message = {
        ...message,
        id: messageId
      }

      // Update local state
      dispatch({ type: 'ADD_MESSAGE', payload: { chatId, message: fullMessage } })

      // Sync to backend
      syncToBackend({ type: 'ADD_MESSAGE', payload: { chatId, message: fullMessage } })

      return messageId
    },
    [dispatch, syncToBackend]
  )

  /**
   * Updates a specific message in a chat.
   *
   * @param chatId - Chat containing the message
   * @param messageId - Message to update
   * @param updates - Fields to update
   */
  const updateMessage = useCallback(
    (chatId: string, messageId: string, updates: Partial<Message>) => {
      dispatch({ type: 'UPDATE_MESSAGE', payload: { chatId, messageId, updates } })
      syncToBackend({ type: 'UPDATE_MESSAGE', payload: { chatId, messageId, updates } })
    },
    [dispatch, syncToBackend]
  )

  // ---------------------------------------------------------------------------
  // Mock Response (Fallback when no API)
  // ---------------------------------------------------------------------------

  /**
   * Simulates a response when running outside Electron.
   *
   * Adds a placeholder message, waits, then fills in content.
   */
  const simulateResponse = useCallback(
    (chatId: string) => {
      // Add placeholder for assistant response
      const placeholderId = addMessage(chatId, {
        role: 'assistant',
        content: '',
        isPlaceholder: true,
        isError: false
      })

      // Mark chat as loading
      dispatch({
        type: 'UPDATE_CHAT',
        payload: { chatId, updates: { isLoadingResponse: true } }
      })

      // Sample responses for demo
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

  // ---------------------------------------------------------------------------
  // Send Message with API (Streaming)
  // ---------------------------------------------------------------------------

  /**
   * Sends a message and receives streaming response from LLM.
   *
   * This is the main function for real chat interactions.
   */
  const sendMessageWithAPI = useCallback(
    async (chatId: string, content: string) => {
      if (!content.trim()) return

      // 1. Add user message
      addMessage(chatId, {
        role: 'user',
        content: content.trim(),
        isPlaceholder: false,
        isError: false
      })

      // 2. Add placeholder for assistant response
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

      // 3. Track placeholder for streaming updates
      streamingMessageIdRef.current.set(chatId, placeholderId)

      // 4. Mark chat as loading
      dispatch({
        type: 'UPDATE_CHAT',
        payload: { chatId, updates: { isLoadingResponse: true } }
      })

      try {
        // 5. Call API to generate response (streaming chunks will arrive via listener)
        await window.api.chats.sendMessage(chatId, content.trim())

        // 6. Clean up tracking and sync final message content to backend
        streamingMessageIdRef.current.delete(chatId)

        // Get the final message content and sync to backend for persistence
        const chat = getChatById(chatId)
        const finalMessage = chat?.messages.find((m) => m.id === placeholderId)
        if (finalMessage) {
          syncToBackend({
            type: 'UPDATE_MESSAGE',
            payload: {
              chatId,
              messageId: placeholderId,
              updates: { content: finalMessage.content, isPlaceholder: false }
            }
          })
        }

        // 7. Mark chat as done loading
        dispatch({
          type: 'UPDATE_CHAT',
          payload: {
            chatId,
            updates: { isLoadingResponse: false, hasReceivedInitialResponse: true }
          }
        })
      } catch (error) {
        console.error('Failed to send message:', error)

        // Update placeholder with error message
        updateMessage(chatId, placeholderId, {
          content: 'Sorry, there was an error processing your message. Please try again.',
          isPlaceholder: false,
          isError: true
        })

        // Clean up
        streamingMessageIdRef.current.delete(chatId)

        dispatch({
          type: 'UPDATE_CHAT',
          payload: { chatId, updates: { isLoadingResponse: false } }
        })
      }
    },
    [addMessage, updateMessage, dispatch, syncToBackend, getChatById]
  )

  // ---------------------------------------------------------------------------
  // Public Send Message Function
  // ---------------------------------------------------------------------------

  /**
   * Sends a message and gets an LLM response.
   *
   * Uses the Electron API if available, otherwise falls back to
   * simulated responses.
   *
   * @param chatId - Chat to send message in
   * @param content - Message text
   */
  const sendMessage = useCallback(
    (chatId: string, content: string) => {
      if (!content.trim()) return

      if (hasElectronAPI()) {
        // Use real API with streaming
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

  // ---------------------------------------------------------------------------
  // Suggestion → Chat Conversion
  // ---------------------------------------------------------------------------

  /**
   * Opens a chat for a suggestion.
   *
   * If a chat already exists for the suggestion, navigates to it.
   * Otherwise, creates a new chat with the suggestion's context.
   *
   * @param suggestion - The suggestion to open a chat for
   */
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

      // Create new chat with suggestion context
      const chatId = createChat({
        title: suggestion.title,
        initialPrompt: suggestion.initialPrompt,
        associatedProjectId: suggestion.projectId,
        associatedSuggestionId: suggestion.suggestionId
      })

      // Add initial chat message as first assistant message (pre-generated intro)
      if (suggestion.initialChatMessage) {
        addMessage(chatId, {
          role: 'assistant',
          content: suggestion.initialChatMessage,
          isPlaceholder: false,
          isError: false
        })
      }

      // Navigate to the new chat
      openChat(chatId)
    },
    [state.chats, createChat, addMessage, openChat]
  )

  // ---------------------------------------------------------------------------
  // Create New Empty Chat
  // ---------------------------------------------------------------------------

  /**
   * Creates a new empty chat and navigates to it.
   */
  const createNewChat = useCallback(() => {
    const chatId = createChat({ title: 'New Chat' })
    openChat(chatId)
  }, [createChat, openChat])

  // ---------------------------------------------------------------------------
  // Return Value
  // ---------------------------------------------------------------------------

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
