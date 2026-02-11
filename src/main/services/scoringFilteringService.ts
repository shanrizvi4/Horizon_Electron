import * as fs from 'fs'
import * as path from 'path'
import { dataStore } from './dataStore'
import { GeneratedSuggestion } from './suggestionGenerationService'
import { SCORING_FILTERING_PROMPTS, formatSuggestionForPrompt } from './prompts'

export interface ScoredSuggestion extends GeneratedSuggestion {
  scores: {
    benefit: number        // 0-1: How beneficial is this suggestion
    urgency: number        // 0-1: How urgent is this
    confidence: number     // 0-1: How confident are we in this suggestion
    relevance: number      // 0-1: How relevant to user's current work
    combined: number       // 0-1: Weighted combination
  }
  filterDecision: {
    passed: boolean
    reason: string
    threshold: number
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
  private readonly PASS_THRESHOLD = 0.5 // Suggestions below this are filtered out

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

    // ============================================================
    // HARDCODED SCORING - SWAP THIS WITH LLM CALL
    // ============================================================
    // PROMPTS THAT WOULD BE SENT TO LLM (for each suggestion):
    const userContext = dataStore.getPropositions().map(p => `- ${p.text}`).join('\n')
    if (suggestions.length > 0) {
      const sampleSuggestion = formatSuggestionForPrompt(suggestions[0])
      console.log('\n--- SCORING PROMPT (sample) ---')
      console.log('SYSTEM:', SCORING_FILTERING_PROMPTS.system.slice(0, 300) + '...')
      console.log('USER:', SCORING_FILTERING_PROMPTS.user(sampleSuggestion, userContext))
      console.log('--- END PROMPT ---\n')
    }
    //
    // To swap with LLM:
    // const scoredSuggestions = await Promise.all(suggestions.map(async s => {
    //   const response = await llm.call({
    //     system: SCORING_FILTERING_PROMPTS.system,
    //     user: SCORING_FILTERING_PROMPTS.user(formatSuggestionForPrompt(s), userContext)
    //   })
    //   const { scores, filterDecision } = JSON.parse(response)
    //   return { ...s, scores, filterDecision, scoredAt: Date.now() }
    // }))
    // ============================================================
    const scoredSuggestions = suggestions.map(s => this.scoreHardcoded(s))
    // ============================================================

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

  private scoreHardcoded(suggestion: GeneratedSuggestion): ScoredSuggestion {
    // Hardcoded scoring logic - ready to swap with LLM

    // Derive scores from rawSupport and some randomness
    const baseScore = suggestion.rawSupport / 10 // Normalize to 0-1

    const scores = {
      benefit: Math.min(1, baseScore + (Math.random() * 0.2 - 0.1)),
      urgency: Math.min(1, 0.3 + Math.random() * 0.4),
      confidence: Math.min(1, baseScore * 0.8 + 0.2),
      relevance: Math.min(1, baseScore + (Math.random() * 0.3 - 0.15)),
      combined: 0
    }

    // Calculate combined score (weighted average)
    scores.combined = (
      scores.benefit * 0.35 +
      scores.urgency * 0.2 +
      scores.confidence * 0.25 +
      scores.relevance * 0.2
    )

    const passed = scores.combined >= this.PASS_THRESHOLD

    return {
      ...suggestion,
      scores,
      filterDecision: {
        passed,
        reason: passed
          ? `Score ${scores.combined.toFixed(2)} >= threshold ${this.PASS_THRESHOLD}`
          : `Score ${scores.combined.toFixed(2)} < threshold ${this.PASS_THRESHOLD}`,
        threshold: this.PASS_THRESHOLD
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
