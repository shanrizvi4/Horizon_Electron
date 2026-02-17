import * as fs from 'fs'
import * as path from 'path'
import { dataStore } from './dataStore'
import { configService } from './config'
import { GeneratedSuggestion } from './suggestionGenerationService'
import { SCORING_FILTERING_PROMPTS, formatSuggestionForPrompt } from './prompts'

/** Gemini API endpoint for text generation */
const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

export interface ScoredSuggestion extends GeneratedSuggestion {
  scores: {
    benefit: number        // 1-10: How beneficial is this suggestion
    disruptionCost: number // 1-10: How disruptive would unsolicited help be
    missCost: number       // 1-10: How critical if user misses this
    decay: number          // 1-10: How much benefit diminishes over time
    combined: number       // 0-1: Weighted combination
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
  private useLLM: boolean = false

  /**
   * Enables or disables real LLM calls.
   */
  setUseLLM(enabled: boolean): void {
    this.useLLM = enabled
    console.log(`Scoring/filtering LLM mode: ${enabled ? 'ENABLED' : 'DISABLED'}`)
  }

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

    let scoredSuggestions: ScoredSuggestion[]

    if (this.useLLM) {
      console.log('\n--- CALLING GEMINI API (Scoring & Filtering) ---')
      try {
        scoredSuggestions = await this.scoreWithLLM(suggestions, userContext)
        console.log('--- GEMINI RESPONSE RECEIVED ---\n')
      } catch (error) {
        console.error('Scoring LLM failed, falling back to hardcoded:', error)
        scoredSuggestions = suggestions.map(s => this.scoreHardcoded(s))
      }
    } else {
      console.log('\n--- SCORING (hardcoded mode) ---')
      scoredSuggestions = suggestions.map(s => this.scoreHardcoded(s))
    }

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

        // Normalize scores to 0-1 range (they come as 1-10)
        const benefit = (scores.benefit || 5) / 10
        const disruptionCost = (scores.disruptionCost || 5) / 10
        const missCost = (scores.missCost || 5) / 10
        const decay = (scores.decay || 5) / 10

        // Combined score: high benefit, low disruption
        const combined = (benefit * 0.5) + ((1 - disruptionCost) * 0.3) + (missCost * 0.2)

        // Pass if benefit >= 5 AND disruptionCost <= 6 (from prompt)
        const passed = parsed.filterDecision?.passed ?? (scores.benefit >= 5 && scores.disruptionCost <= 6)

        scoredSuggestions.push({
          ...suggestion,
          scores: {
            benefit,
            disruptionCost,
            missCost,
            decay,
            combined
          },
          filterDecision: {
            passed,
            reason: parsed.filterDecision?.reason || `Benefit: ${scores.benefit}, Disruption: ${scores.disruptionCost}`
          },
          scoredAt: Date.now()
        })
      } catch {
        // If parsing fails, use hardcoded scoring for this suggestion
        console.error('Failed to parse LLM scoring response, using hardcoded')
        scoredSuggestions.push(this.scoreHardcoded(suggestion))
      }
    }

    return scoredSuggestions
  }

  private scoreHardcoded(suggestion: GeneratedSuggestion): ScoredSuggestion {
    // Hardcoded scoring logic - fallback when LLM fails

    // Derive scores from rawSupport
    const baseScore = suggestion.rawSupport / 10 // Normalize to 0-1

    const scores = {
      benefit: Math.min(1, baseScore + (Math.random() * 0.2 - 0.1)),
      disruptionCost: Math.min(1, 0.3 + Math.random() * 0.3),
      missCost: Math.min(1, baseScore * 0.6 + 0.2),
      decay: Math.min(1, 0.5 + Math.random() * 0.3),
      combined: 0
    }

    // Calculate combined score
    scores.combined = (scores.benefit * 0.5) + ((1 - scores.disruptionCost) * 0.3) + (scores.missCost * 0.2)

    const passed = scores.benefit >= 0.5 && scores.disruptionCost <= 0.6

    return {
      ...suggestion,
      scores,
      filterDecision: {
        passed,
        reason: passed
          ? `Benefit ${(scores.benefit * 10).toFixed(0)}/10, Disruption ${(scores.disruptionCost * 10).toFixed(0)}/10`
          : `Low benefit or high disruption cost`
      },
      scoredAt: Date.now()
    }
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
