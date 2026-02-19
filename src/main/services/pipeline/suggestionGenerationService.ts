import * as fs from 'fs'
import * as path from 'path'
import { dataStore } from '../core/dataStore'
import { configService } from '../core/config'
import { frameAnalysisService, FrameAnalysis } from './frameAnalysisService'
import { SUGGESTION_GENERATION_PROMPTS, formatFrameAnalysesForPrompt } from './prompts'

/** Gemini API endpoint for text generation */
const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

export interface GeneratedSuggestion {
  id: string
  title: string
  description: string
  category: 'problem' | 'efficiency' | 'learning'
  approach: string
  keywords: string[]
  supportEvidence: string[]
  rawSupport: number // 1-10 scale before filtering
  confidence: number // 0-1 scale - how confident the LLM is in this suggestion
  decayProfile: 'ephemeral' | 'session' | 'durable' | 'evergreen'
  sourceFrames: string[] // Frame IDs that contributed to this suggestion
  initialChatMessage: string // Pre-generated message shown when user starts chat
  generatedAt: number
}

export interface SuggestionGenerationResult {
  batchId: string
  frameAnalyses: FrameAnalysis[]
  suggestions: GeneratedSuggestion[]
  generatedAt: number
}

class SuggestionGenerationService {
  private generationDir: string = ''
  private lastProcessedTimestamp: number = 0

  async initialize(): Promise<void> {
    this.generationDir = path.join(dataStore.getDataDir(), 'suggestion_generation')
    await fs.promises.mkdir(this.generationDir, { recursive: true })
    await this.loadLastProcessedTimestamp()
  }

  private async loadLastProcessedTimestamp(): Promise<void> {
    try {
      const metaPath = path.join(this.generationDir, '_meta.json')
      const content = await fs.promises.readFile(metaPath, 'utf-8')
      const meta = JSON.parse(content)
      this.lastProcessedTimestamp = meta.lastProcessedTimestamp || 0
    } catch {
      this.lastProcessedTimestamp = 0
    }
  }

  private async saveLastProcessedTimestamp(): Promise<void> {
    const metaPath = path.join(this.generationDir, '_meta.json')
    await fs.promises.writeFile(metaPath, JSON.stringify({
      lastProcessedTimestamp: this.lastProcessedTimestamp
    }, null, 2))
  }

  async generateFromRecentFrames(): Promise<SuggestionGenerationResult | null> {
    // Get frame analyses since last processing
    const allAnalyses = await frameAnalysisService.getAllAnalyses()
    const newAnalyses = allAnalyses.filter(a => a.timestamp > this.lastProcessedTimestamp)

    if (newAnalyses.length === 0) {
      console.log('No new frame analyses to process')
      return null
    }

    console.log(`Generating suggestions from ${newAnalyses.length} new frame analyses`)

    const batchId = `batch_${Date.now()}`

    const frameAnalysesText = formatFrameAnalysesForPrompt(newAnalyses)
    const userPropositions = dataStore.getPropositions().map(p => `- ${p.text}`).join('\n')

    console.log('\n--- CALLING GEMINI API (Suggestion Generation) ---')
    const suggestions = await this.generateWithLLM(frameAnalysesText, userPropositions, newAnalyses)
    console.log('--- GEMINI RESPONSE RECEIVED ---\n')

    const result: SuggestionGenerationResult = {
      batchId,
      frameAnalyses: newAnalyses,
      suggestions,
      generatedAt: Date.now()
    }

    // Save to disk
    const resultPath = path.join(this.generationDir, `${batchId}.json`)
    await fs.promises.writeFile(resultPath, JSON.stringify(result, null, 2))
    console.log(`Suggestion generation saved: ${resultPath}`)

    // Update last processed timestamp
    this.lastProcessedTimestamp = Math.max(...newAnalyses.map(a => a.timestamp))
    await this.saveLastProcessedTimestamp()

    return result
  }

  /**
   * Generates suggestions using the Gemini LLM.
   */
  private async generateWithLLM(
    frameAnalysesText: string,
    userPropositions: string,
    analyses: FrameAnalysis[]
  ): Promise<GeneratedSuggestion[]> {
    const apiKey = configService.getGeminiApiKey()
    if (!apiKey || apiKey === 'your_api_key_here') {
      throw new Error('GEMINI_API_KEY not configured')
    }

    const systemPrompt = SUGGESTION_GENERATION_PROMPTS.system
    const userPrompt = SUGGESTION_GENERATION_PROMPTS.user(frameAnalysesText, userPropositions)
    const fullPrompt = `${systemPrompt}\n\n${userPrompt}`

    const request = {
      contents: [{ parts: [{ text: fullPrompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048
      }
    }

    console.log('Sending request to Gemini API (Suggestion Generation)...')
    const url = `${GEMINI_API_URL}?key=${apiKey}`

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text

    if (!text) {
      throw new Error('No text in Gemini response')
    }

    // Parse JSON from response (handle markdown code blocks)
    let jsonText = text
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      jsonText = jsonMatch[1].trim()
    }

    try {
      const parsed = JSON.parse(jsonText)
      const now = Date.now()
      const suggestions: GeneratedSuggestion[] = []

      // Handle both array and object with suggestions property
      const rawSuggestions = Array.isArray(parsed) ? parsed : (parsed.suggestions || [])

      for (let i = 0; i < rawSuggestions.length; i++) {
        const s = rawSuggestions[i]

        // Only include suggestions with confidence >= 0.5
        const confidence = s.confidence ?? 0.7
        if (confidence < 0.5) {
          console.log(`Skipping suggestion "${s.title}" with low confidence: ${confidence}`)
          continue
        }

        suggestions.push({
          id: `sug_gen_${now}_${i}`,
          title: s.title || 'Untitled suggestion',
          description: s.description || '',
          category: s.category || 'efficiency',
          approach: s.approach || '',
          keywords: s.keywords || [],
          supportEvidence: s.supportEvidence || analyses.slice(0, 3).map(a => a.analysis.description),
          rawSupport: s.rawSupport || s.support || 7,
          confidence,
          decayProfile: s.decayProfile || 'session',
          sourceFrames: analyses.map(a => a.frameId),
          initialChatMessage: s.initialChatMessage || '',
          generatedAt: now
        })
      }

      return suggestions
    } catch {
      console.error('Failed to parse LLM response as JSON')
      throw new Error('Failed to parse LLM response as JSON')
    }
  }

  async getAllGenerationResults(): Promise<SuggestionGenerationResult[]> {
    const results: SuggestionGenerationResult[] = []
    try {
      const files = await fs.promises.readdir(this.generationDir)
      for (const file of files) {
        if (file.startsWith('batch_') && file.endsWith('.json')) {
          const content = await fs.promises.readFile(path.join(this.generationDir, file), 'utf-8')
          results.push(JSON.parse(content))
        }
      }
    } catch (error) {
      console.error('Failed to get generation results:', error)
    }
    return results.sort((a, b) => b.generatedAt - a.generatedAt)
  }

  getGenerationDir(): string {
    return this.generationDir
  }
}

export const suggestionGenerationService = new SuggestionGenerationService()
