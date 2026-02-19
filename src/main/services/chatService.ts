/**
 * =============================================================================
 * CHAT SERVICE
 * =============================================================================
 *
 * Handles LLM (Large Language Model) integration for chat functionality.
 * Currently integrates with Google's Gemini API for response generation.
 *
 * FEATURES:
 * - Streaming responses (real-time text generation)
 * - Context building from chat history, suggestions, and user preferences
 * - Automatic retry with exponential backoff
 * - Automatic retry with error propagation when API unavailable
 *
 * DATA FLOW:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  Frontend sends message                                                 │
 * │         │                                                               │
 * │         ▼                                                               │
 * │  ┌─────────────────┐     ┌─────────────────────────────────────────┐   │
 * │  │ IPC Handler     │ ──► │ chatService.generateResponse()          │   │
 * │  │ (chats.ts)      │     │  - Builds context from:                 │   │
 * │  └─────────────────┘     │    • Chat message history               │   │
 * │                          │    • Associated suggestion              │   │
 * │                          │    • User propositions (memories)       │   │
 * │                          │    • Agent customization config         │   │
 * │                          └─────────────────────────────────────────┘   │
 * │                                      │                                  │
 * │                                      ▼                                  │
 * │                          ┌─────────────────────────────────────────┐   │
 * │                          │ Gemini API (streaming)                  │   │
 * │                          └─────────────────────────────────────────┘   │
 * │                                      │                                  │
 * │                                      ▼                                  │
 * │                          ┌─────────────────────────────────────────┐   │
 * │                          │ onChunk callback ──► IPC stream event   │   │
 * │                          │ ──► Frontend updates UI in real-time    │   │
 * │                          └─────────────────────────────────────────┘   │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * @module services/chatService
 */

import type { Chat } from '../types'
import { dataStore } from './dataStore'
import { configService } from './config'

// =============================================================================
// CONFIGURATION
// =============================================================================

/** Gemini API endpoint for streaming content generation */
const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent'

/** Maximum retry attempts before throwing error */
const MAX_RETRIES = 3

/** Base delay between retries (multiplied by attempt number) */
const RETRY_DELAY_MS = 1000

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Gemini API message format.
 * Each message has a role (user or model) and content parts.
 */
interface GeminiContent {
  role: 'user' | 'model'
  parts: { text: string }[]
}

/**
 * Complete Gemini API request structure.
 */
interface GeminiRequest {
  /** Conversation history */
  contents: GeminiContent[]

  /** System-level instructions (context, preferences) */
  systemInstruction?: { parts: { text: string }[] }

  /** Generation parameters */
  generationConfig?: {
    temperature?: number // Creativity (0-1)
    topK?: number // Token diversity
    topP?: number // Nucleus sampling
    maxOutputTokens?: number // Response length limit
  }
}

/**
 * Structure of a streaming response chunk from Gemini.
 */
interface GeminiStreamChunk {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>
    }
  }>
}

// =============================================================================
// CHAT SERVICE CLASS
// =============================================================================

/**
 * Service for generating LLM chat responses.
 *
 * USAGE:
 * ```typescript
 * import { chatService } from './services/chatService'
 *
 * // Generate streaming response
 * await chatService.generateResponse(chat, userMessage, (chunk) => {
 *   // Handle each text chunk as it arrives
 *   console.log('Received chunk:', chunk)
 * })
 * ```
 */
class ChatService {
  // ---------------------------------------------------------------------------
  // Private State
  // ---------------------------------------------------------------------------

  /** Cached API key */
  private apiKey: string | null = null

  // ---------------------------------------------------------------------------
  // API Key Management
  // ---------------------------------------------------------------------------

  /**
   * Manually sets the API key.
   * Use this to override the config file setting.
   */
  setApiKey(key: string): void {
    this.apiKey = key
  }

  /**
   * Gets the Gemini API key.
   *
   * Priority:
   * 1. Cached key (if set via setApiKey)
   * 2. GEMINI_API_KEY environment variable
   * 3. config.json file
   *
   * @returns API key or null if not configured
   */
  getApiKey(): string | null {
    if (!this.apiKey) {
      const key = configService.getGeminiApiKey()
      // Treat placeholder value as missing
      this.apiKey = key && key !== 'your_api_key_here' ? key : null
    }
    return this.apiKey
  }

  // ---------------------------------------------------------------------------
  // Request Building
  // ---------------------------------------------------------------------------

  /**
   * Builds a Gemini API request from chat context.
   *
   * Includes:
   * - Message history (user and assistant messages)
   * - System instruction with:
   *   - Initial prompt from chat
   *   - Execution output from associated suggestion
   *   - User propositions (memories/preferences)
   *   - Agent customization config
   *
   * @param chat - The chat object with message history
   * @param userMessage - The new message to respond to
   * @returns Formatted Gemini API request
   */
  private buildGeminiRequest(chat: Chat, userMessage: string): GeminiRequest {
    const contents: GeminiContent[] = []

    // -------------------------------------------------------------------------
    // Build Message History
    // -------------------------------------------------------------------------

    for (const msg of chat.messages) {
      // Skip prompt messages (they go in systemInstruction)
      if (msg.role === 'prompt') {
        continue
      }

      // Add user messages
      if (msg.role === 'user') {
        contents.push({
          role: 'user',
          parts: [{ text: msg.content }]
        })
      }

      // Add assistant messages (skip placeholders - they're loading indicators)
      if (msg.role === 'assistant' && !msg.isPlaceholder) {
        contents.push({
          role: 'model',
          parts: [{ text: msg.content }]
        })
      }
    }

    // Note: userMessage is already in chat.messages (added by frontend before API call)
    // So we don't add it again here

    // -------------------------------------------------------------------------
    // Build System Instruction
    // -------------------------------------------------------------------------

    const systemParts: string[] = []

    // 1. Add initial prompt from chat (if exists)
    if (chat.initialPrompt) {
      systemParts.push(chat.initialPrompt)
    }

    // 2. Add context from associated suggestion
    if (chat.associatedSuggestionId) {
      const suggestion = dataStore.getSuggestionById(chat.associatedSuggestionId)
      if (suggestion?.executionOutput) {
        systemParts.push(`Context from previous analysis:\n${suggestion.executionOutput}`)
      }
    }

    // 3. Add user propositions (memories/preferences)
    const propositions = dataStore.getPropositions()
    if (propositions.length > 0) {
      const propsText = propositions.map((p) => `- ${p.text}`).join('\n')
      systemParts.push(`User preferences and context:\n${propsText}`)
    }

    // 4. Add agent customization config
    const agentConfig = dataStore.getAgentConfig()
    if (agentConfig.focusMoreOn || agentConfig.focusLessOn || agentConfig.style) {
      const configParts: string[] = []
      if (agentConfig.focusMoreOn) {
        configParts.push(`Focus more on: ${agentConfig.focusMoreOn}`)
      }
      if (agentConfig.focusLessOn) {
        configParts.push(`Focus less on: ${agentConfig.focusLessOn}`)
      }
      if (agentConfig.style) {
        configParts.push(`Communication style: ${agentConfig.style}`)
      }
      systemParts.push(`Agent customization:\n${configParts.join('\n')}`)
    }

    // -------------------------------------------------------------------------
    // Assemble Request
    // -------------------------------------------------------------------------

    const request: GeminiRequest = {
      contents,
      generationConfig: {
        temperature: 0.7, // Balanced creativity
        topK: 40, // Consider top 40 tokens
        topP: 0.95, // Use 95% probability mass
        maxOutputTokens: 2048 // Limit response length
      }
    }

    // Add system instruction if we have any context
    if (systemParts.length > 0) {
      request.systemInstruction = {
        parts: [{ text: systemParts.join('\n\n') }]
      }
    }

    return request
  }

  // ---------------------------------------------------------------------------
  // Response Generation
  // ---------------------------------------------------------------------------

  /**
   * Generates a streaming response for a chat message.
   *
   * @param chat - The chat object with history
   * @param userMessage - The message to respond to
   * @param onChunk - Callback invoked for each text chunk received
   *
   * @example
   * ```typescript
   * let fullResponse = ''
   * await chatService.generateResponse(chat, 'Hello!', (chunk) => {
   *   fullResponse += chunk
   *   updateUI(fullResponse)
   * })
   * ```
   */
  async generateResponse(
    chat: Chat,
    userMessage: string,
    onChunk: (chunk: string) => void
  ): Promise<void> {
    const apiKey = this.getApiKey()

    // Debug logging
    console.log('=== CHAT SERVICE DEBUG ===')
    console.log('User message:', userMessage)
    console.log('Chat messages count:', chat.messages.length)
    console.log('Chat messages:', chat.messages.map(m => ({ role: m.role, contentPreview: m.content.slice(0, 50), isPlaceholder: m.isPlaceholder })))
    console.log('Chat initialPrompt:', chat.initialPrompt?.slice(0, 100))
    console.log('========================')

    // Require API key
    if (!apiKey) {
      throw new Error('No Gemini API key configured. Please add your API key in Settings.')
    }

    // Build the API request
    const request = this.buildGeminiRequest(chat, userMessage)
    console.log('Request contents:', JSON.stringify(request.contents, null, 2))

    // Attempt API call with retries
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        await this.streamFromGemini(apiKey, request, onChunk)
        return // Success - exit
      } catch (error) {
        console.error(`Gemini API attempt ${attempt + 1} failed:`, error)

        // Wait before retrying (exponential backoff)
        if (attempt < MAX_RETRIES - 1) {
          await this.delay(RETRY_DELAY_MS * (attempt + 1))
        }
      }
    }

    // All retries exhausted
    throw new Error('All Gemini API attempts failed. Please check your API key and try again.')
  }

  /**
   * Streams response from Gemini API using Server-Sent Events (SSE).
   *
   * @param apiKey - Gemini API key
   * @param request - Formatted API request
   * @param onChunk - Callback for each text chunk
   */
  private async streamFromGemini(
    apiKey: string,
    request: GeminiRequest,
    onChunk: (chunk: string) => void
  ): Promise<void> {
    // Use SSE format for streaming
    const url = `${GEMINI_API_URL}?alt=sse&key=${apiKey}`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    })

    // Check for errors
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`)
    }

    if (!response.body) {
      throw new Error('No response body from Gemini API')
    }

    // -------------------------------------------------------------------------
    // Process SSE Stream
    // -------------------------------------------------------------------------

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()

      if (done) break

      // Decode bytes to text and add to buffer
      buffer += decoder.decode(value, { stream: true })

      // Process complete lines
      const lines = buffer.split('\n')
      buffer = lines.pop() || '' // Keep incomplete line in buffer

      for (const line of lines) {
        // SSE data lines start with "data: "
        if (line.startsWith('data: ')) {
          const data = line.slice(6)

          // Skip stream end marker
          if (data === '[DONE]') continue

          try {
            const parsed: GeminiStreamChunk = JSON.parse(data)
            const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text

            if (text) {
              onChunk(text)
            }
          } catch {
            // Ignore JSON parse errors for partial/malformed chunks
          }
        }
      }
    }

    // Process any remaining data in buffer
    if (buffer.startsWith('data: ')) {
      const data = buffer.slice(6)
      if (data !== '[DONE]') {
        try {
          const parsed: GeminiStreamChunk = JSON.parse(data)
          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text

          if (text) {
            onChunk(text)
          }
        } catch {
          // Ignore parse errors
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Utility
  // ---------------------------------------------------------------------------

  /**
   * Promise-based delay.
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

/**
 * Singleton instance of the ChatService.
 *
 * @example
 * ```typescript
 * import { chatService } from './services/chatService'
 *
 * // Generate response with streaming
 * await chatService.generateResponse(chat, message, (chunk) => {
 *   // Send chunk to frontend
 *   webContents.send('chats:streamChunk', { chatId, chunk })
 * })
 * ```
 */
export const chatService = new ChatService()
