import type { Chat } from '../types'
import { dataStore } from './dataStore'

// Gemini API configuration
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent'
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000

interface GeminiContent {
  role: 'user' | 'model'
  parts: { text: string }[]
}

interface GeminiRequest {
  contents: GeminiContent[]
  systemInstruction?: { parts: { text: string }[] }
  generationConfig?: {
    temperature?: number
    topK?: number
    topP?: number
    maxOutputTokens?: number
  }
}

interface GeminiStreamChunk {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>
    }
  }>
}

class ChatService {
  private apiKey: string | null = null

  setApiKey(key: string): void {
    this.apiKey = key
  }

  getApiKey(): string | null {
    // Try to get from environment first
    if (!this.apiKey) {
      this.apiKey = process.env.GEMINI_API_KEY || null
    }
    return this.apiKey
  }

  private buildGeminiRequest(chat: Chat, userMessage: string): GeminiRequest {
    const contents: GeminiContent[] = []

    // Build message history
    for (const msg of chat.messages) {
      if (msg.role === 'prompt') {
        // System/prompt messages become part of the conversation context
        continue // Handled in systemInstruction
      } else if (msg.role === 'user') {
        contents.push({
          role: 'user',
          parts: [{ text: msg.content }]
        })
      } else if (msg.role === 'assistant' && !msg.isPlaceholder) {
        contents.push({
          role: 'model',
          parts: [{ text: msg.content }]
        })
      }
    }

    // Add the new user message
    contents.push({
      role: 'user',
      parts: [{ text: userMessage }]
    })

    // Build system instruction from chat context
    const systemParts: string[] = []

    // Add initial prompt if exists
    if (chat.initialPrompt) {
      systemParts.push(chat.initialPrompt)
    }

    // Get associated suggestion context
    if (chat.associatedSuggestionId) {
      const suggestion = dataStore.getSuggestionById(chat.associatedSuggestionId)
      if (suggestion?.executionOutput) {
        systemParts.push(`Context from previous analysis:\n${suggestion.executionOutput}`)
      }
    }

    // Add user propositions for context
    const propositions = dataStore.getPropositions()
    if (propositions.length > 0) {
      const propsText = propositions.map((p) => `- ${p.text}`).join('\n')
      systemParts.push(`User preferences and context:\n${propsText}`)
    }

    // Add agent config
    const agentConfig = dataStore.getAgentConfig()
    if (agentConfig.focusMoreOn || agentConfig.focusLessOn || agentConfig.style) {
      const configParts: string[] = []
      if (agentConfig.focusMoreOn) configParts.push(`Focus more on: ${agentConfig.focusMoreOn}`)
      if (agentConfig.focusLessOn) configParts.push(`Focus less on: ${agentConfig.focusLessOn}`)
      if (agentConfig.style) configParts.push(`Communication style: ${agentConfig.style}`)
      systemParts.push(`Agent customization:\n${configParts.join('\n')}`)
    }

    const request: GeminiRequest = {
      contents,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048
      }
    }

    if (systemParts.length > 0) {
      request.systemInstruction = {
        parts: [{ text: systemParts.join('\n\n') }]
      }
    }

    return request
  }

  async generateResponse(
    chat: Chat,
    userMessage: string,
    onChunk: (chunk: string) => void
  ): Promise<void> {
    const apiKey = this.getApiKey()

    if (!apiKey) {
      // Fall back to mock response if no API key
      console.log('No Gemini API key configured, using mock response')
      await this.generateMockResponse(onChunk)
      return
    }

    const request = this.buildGeminiRequest(chat, userMessage)

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        await this.streamFromGemini(apiKey, request, onChunk)
        return // Success
      } catch (error) {
        console.error(`Gemini API attempt ${attempt + 1} failed:`, error)

        if (attempt < MAX_RETRIES - 1) {
          await this.delay(RETRY_DELAY_MS * (attempt + 1))
        }
      }
    }

    // All retries failed, use mock response
    console.error('All Gemini API attempts failed, using mock response')
    await this.generateMockResponse(onChunk)
  }

  private async streamFromGemini(
    apiKey: string,
    request: GeminiRequest,
    onChunk: (chunk: string) => void
  ): Promise<void> {
    const url = `${GEMINI_API_URL}?alt=sse&key=${apiKey}`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`)
    }

    if (!response.body) {
      throw new Error('No response body from Gemini API')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()

      if (done) break

      buffer += decoder.decode(value, { stream: true })

      // Process SSE events
      const lines = buffer.split('\n')
      buffer = lines.pop() || '' // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') continue

          try {
            const parsed: GeminiStreamChunk = JSON.parse(data)
            const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text
            if (text) {
              onChunk(text)
            }
          } catch {
            // Ignore parse errors for partial chunks
          }
        }
      }
    }

    // Process any remaining buffer
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
          // Ignore
        }
      }
    }
  }

  private async generateMockResponse(onChunk: (chunk: string) => void): Promise<void> {
    const responses = [
      "I understand you're asking about this topic. Let me help you with that.\n\nBased on the context you've provided, here are some key insights:\n\n1. **First consideration** - This is an important aspect to keep in mind when approaching this problem.\n\n2. **Second point** - Building on the first idea, we can see how these concepts connect.\n\n3. **Practical suggestion** - Here's what I'd recommend as a next step.\n\nWould you like me to elaborate on any of these points?",

      "Thank you for your question. Let me break this down:\n\n**Analysis:**\nLooking at the information available, there are several factors to consider.\n\n**Recommendations:**\n- Start by understanding the core requirements\n- Consider the trade-offs between different approaches\n- Test your assumptions with small experiments\n\n**Next Steps:**\nI'd suggest focusing on the most impactful areas first. What aspect would you like to explore further?",

      "Great question! Here's my perspective:\n\nThe key insight here is understanding how different components interact. When we look at the bigger picture, we can identify patterns that help guide our decisions.\n\n**Key Takeaways:**\n1. Context matters - always consider the broader environment\n2. Iterate quickly - small experiments reveal valuable information\n3. Document learnings - future decisions benefit from past insights\n\nLet me know if you'd like to dive deeper into any specific area."
    ]

    const response = responses[Math.floor(Math.random() * responses.length)]

    // Simulate streaming by sending chunks
    const words = response.split(' ')
    let chunkSize = 3

    for (let i = 0; i < words.length; i += chunkSize) {
      const chunk = words.slice(i, i + chunkSize).join(' ') + ' '
      onChunk(chunk)
      await this.delay(50 + Math.random() * 50)
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

// Singleton instance
export const chatService = new ChatService()
