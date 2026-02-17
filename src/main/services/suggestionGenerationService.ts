import * as fs from 'fs'
import * as path from 'path'
import { dataStore } from './dataStore'
import { configService } from './config'
import { frameAnalysisService, FrameAnalysis } from './frameAnalysisService'
import { SUGGESTION_GENERATION_PROMPTS, formatFrameAnalysesForPrompt } from './prompts'

/** Gemini API endpoint for text generation */
const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

export interface GeneratedSuggestion {
  id: string
  title: string
  description: string
  approach: string
  keywords: string[]
  supportEvidence: string[]
  rawSupport: number // 1-10 scale before filtering
  sourceFrames: string[] // Frame IDs that contributed to this suggestion
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
  private useLLM: boolean = false

  /**
   * Enables or disables real LLM calls.
   */
  setUseLLM(enabled: boolean): void {
    this.useLLM = enabled
    console.log(`Suggestion generation LLM mode: ${enabled ? 'ENABLED' : 'DISABLED'}`)
  }

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

    let suggestions: GeneratedSuggestion[]

    if (this.useLLM) {
      console.log('\n--- CALLING GEMINI API (Suggestion Generation) ---')
      try {
        suggestions = await this.generateWithLLM(frameAnalysesText, userPropositions, newAnalyses)
        console.log('--- GEMINI RESPONSE RECEIVED ---\n')
      } catch (error) {
        console.error('Suggestion generation LLM failed, falling back to hardcoded:', error)
        suggestions = this.generateHardcodedSuggestions(newAnalyses)
      }
    } else {
      console.log('\n--- SUGGESTION GENERATION (hardcoded mode) ---')
      suggestions = this.generateHardcodedSuggestions(newAnalyses)
    }

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
        suggestions.push({
          id: `sug_gen_${now}_${i}`,
          title: s.title || 'Untitled suggestion',
          description: s.description || '',
          approach: s.approach || '',
          keywords: s.keywords || [],
          supportEvidence: s.supportEvidence || analyses.slice(0, 3).map(a => a.analysis.description),
          rawSupport: s.rawSupport || s.support || 7,
          sourceFrames: analyses.map(a => a.frameId),
          generatedAt: now
        })
      }

      return suggestions
    } catch {
      console.error('Failed to parse LLM response, attempting to extract suggestions from text')
      // If JSON parsing fails, return empty array and let hardcoded fallback handle it
      throw new Error('Failed to parse LLM response as JSON')
    }
  }

  private generateHardcodedSuggestions(analyses: FrameAnalysis[]): GeneratedSuggestion[] {
    // Aggregate keywords from all analyses
    const allKeywords = analyses.flatMap(a => a.analysis.keywords)
    const keywordCounts = new Map<string, number>()
    for (const kw of allKeywords) {
      keywordCounts.set(kw, (keywordCounts.get(kw) || 0) + 1)
    }

    // Sort by frequency
    const topKeywords = Array.from(keywordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([kw]) => kw)

    const suggestions: GeneratedSuggestion[] = []
    const now = Date.now()

    // Generate 1-3 suggestions based on detected patterns
    const templates = [
      {
        titleTemplate: 'Review ${keyword} best practices',
        descriptionTemplate: 'Based on your recent activity with ${keyword}, reviewing best practices could improve your workflow.',
        approach: 'Research documentation and apply relevant patterns'
      },
      {
        titleTemplate: 'Optimize ${keyword} workflow',
        descriptionTemplate: 'You\'ve been spending time on ${keyword}. Consider optimizing this workflow.',
        approach: 'Identify bottlenecks and implement improvements'
      },
      {
        titleTemplate: 'Document ${keyword} process',
        descriptionTemplate: 'Your work with ${keyword} could benefit from documentation for future reference.',
        approach: 'Create clear documentation with examples'
      }
    ]

    const numSuggestions = Math.min(topKeywords.length, 3)
    for (let i = 0; i < numSuggestions; i++) {
      const keyword = topKeywords[i]
      const template = templates[i % templates.length]

      suggestions.push({
        id: `sug_gen_${now}_${i}`,
        title: template.titleTemplate.replace('${keyword}', keyword),
        description: template.descriptionTemplate.replace('${keyword}', keyword),
        approach: template.approach,
        keywords: [keyword, ...topKeywords.slice(0, 3)],
        supportEvidence: analyses.slice(0, 3).map(a => a.analysis.description),
        rawSupport: 5 + Math.floor(Math.random() * 5), // 5-9
        sourceFrames: analyses.map(a => a.frameId),
        generatedAt: now
      })
    }

    return suggestions
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
