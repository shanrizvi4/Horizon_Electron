import * as fs from 'fs'
import * as path from 'path'
import { dataStore } from '../core/dataStore'
import { configService } from '../core/config'
import { GeneratedSuggestion } from './suggestionGenerationService'
import { SCORING_FILTERING_PROMPTS, formatSuggestionForPrompt } from './prompts'

/** Gemini API endpoint for text generation */
const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

export interface ScoredSuggestion extends GeneratedSuggestion {
  scores: {
    importance: number     // 0-10: How much value if valid
    confidence: number     // 0-10: How likely is it correct (highest weight)
    timeliness: number     // 0-10: Is now the right moment (stuck vs flow)
    actionability: number  // 0-10: Can user act immediately
    compositeScore: number // Weighted: 0.3*importance + 0.4*confidence + 0.2*timeliness + 0.1*actionability
  }
  filterDecision: {
    passed: boolean
    reason: string
  }
  scoredAt: number
}

export interface ScoringResult {
  batchId: string
  inputSuggestions: GeneratedSuggestion[]
  scoredSuggestions: ScoredSuggestion[]
  passedSuggestions: ScoredSuggestion[]
  filteredOut: ScoredSuggestion[]
  scoredAt: number
}

class ScoringFilteringService {
  private scoringDir: string = ''

  async initialize(): Promise<void> {
    this.scoringDir = path.join(dataStore.getDataDir(), 'scoring_filtering')
    await fs.promises.mkdir(this.scoringDir, { recursive: true })
  }

  async scoreSuggestions(suggestions: GeneratedSuggestion[]): Promise<ScoringResult> {
    if (suggestions.length === 0) {
      return {
        batchId: `score_${Date.now()}`,
        inputSuggestions: [],
        scoredSuggestions: [],
        passedSuggestions: [],
        filteredOut: [],
        scoredAt: Date.now()
      }
    }

    console.log(`Scoring ${suggestions.length} suggestions`)

    const batchId = `score_${Date.now()}`
    const userContext = dataStore.getPropositions().map(p => `- ${p.text}`).join('\n')

    console.log('\n--- CALLING GEMINI API (Scoring & Filtering) ---')
    const scoredSuggestions = await this.scoreWithLLM(suggestions, userContext)
    console.log('--- GEMINI RESPONSE RECEIVED ---\n')

    const passedSuggestions = scoredSuggestions.filter(s => s.filterDecision.passed)
    const filteredOut = scoredSuggestions.filter(s => !s.filterDecision.passed)

    const result: ScoringResult = {
      batchId,
      inputSuggestions: suggestions,
      scoredSuggestions,
      passedSuggestions,
      filteredOut,
      scoredAt: Date.now()
    }

    // Save to disk
    const resultPath = path.join(this.scoringDir, `${batchId}.json`)
    await fs.promises.writeFile(resultPath, JSON.stringify(result, null, 2))
    console.log(`Scoring result saved: ${resultPath}`)
    console.log(`  Passed: ${passedSuggestions.length}, Filtered: ${filteredOut.length}`)

    return result
  }

  /**
   * Scores suggestions using the Gemini LLM.
   */
  private async scoreWithLLM(
    suggestions: GeneratedSuggestion[],
    userContext: string
  ): Promise<ScoredSuggestion[]> {
    const apiKey = configService.getGeminiApiKey()
    if (!apiKey || apiKey === 'your_api_key_here') {
      throw new Error('GEMINI_API_KEY not configured')
    }

    const scoredSuggestions: ScoredSuggestion[] = []

    for (const suggestion of suggestions) {
      const suggestionText = formatSuggestionForPrompt(suggestion)
      const systemPrompt = SCORING_FILTERING_PROMPTS.system
      const userPrompt = SCORING_FILTERING_PROMPTS.user(suggestionText, userContext)
      const fullPrompt = `${systemPrompt}\n\n${userPrompt}`

      const request = {
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 512
        }
      }

      console.log(`Scoring suggestion: ${suggestion.title.slice(0, 50)}...`)
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

      // Parse JSON from response
      let jsonText = text
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (jsonMatch) {
        jsonText = jsonMatch[1].trim()
      }

      try {
        const parsed = JSON.parse(jsonText)
        const scores = parsed.scores || {}

        // Get raw scores (0-10 scale)
        const importance = scores.importance ?? 5
        const confidence = scores.confidence ?? 5
        const timeliness = scores.timeliness ?? 5
        const actionability = scores.actionability ?? 5

        // Calculate composite score: 0.3*importance + 0.4*confidence + 0.2*timeliness + 0.1*actionability
        const compositeScore = parsed.compositeScore ??
          (0.3 * importance + 0.4 * confidence + 0.2 * timeliness + 0.1 * actionability)

        // Pass if ALL dimensions >= 5 AND composite >= 6.0
        const allAboveThreshold = importance >= 5 && confidence >= 5 && timeliness >= 5 && actionability >= 5
        const compositeAboveThreshold = compositeScore >= 6.0
        const passed = parsed.filterDecision?.passed ?? (allAboveThreshold && compositeAboveThreshold)

        scoredSuggestions.push({
          ...suggestion,
          scores: {
            importance,
            confidence,
            timeliness,
            actionability,
            compositeScore
          },
          filterDecision: {
            passed,
            reason: parsed.filterDecision?.reason ||
              `I:${importance} C:${confidence} T:${timeliness} A:${actionability} = ${compositeScore.toFixed(1)}`
          },
          scoredAt: Date.now()
        })
      } catch {
        throw new Error(`Failed to parse LLM scoring response for suggestion: ${suggestion.title}`)
      }
    }

    return scoredSuggestions
  }

  async getAllScoringResults(): Promise<ScoringResult[]> {
    const results: ScoringResult[] = []
    try {
      const files = await fs.promises.readdir(this.scoringDir)
      for (const file of files) {
        if (file.startsWith('score_') && file.endsWith('.json')) {
          const content = await fs.promises.readFile(path.join(this.scoringDir, file), 'utf-8')
          results.push(JSON.parse(content))
        }
      }
    } catch (error) {
      console.error('Failed to get scoring results:', error)
    }
    return results.sort((a, b) => b.scoredAt - a.scoredAt)
  }

  getScoringDir(): string {
    return this.scoringDir
  }
}

export const scoringFilteringService = new ScoringFilteringService()
