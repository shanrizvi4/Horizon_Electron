/**
 * =============================================================================
 * EVALUATION DATA SERVICE
 * =============================================================================
 *
 * Service for reading and aggregating pipeline data for the Evaluation page.
 * Provides methods to access frame analyses, concentration gate decisions,
 * suggestion generation batches, scoring results, and deduplication results.
 *
 * @module services/evaluationDataService
 */

import * as fs from 'fs'
import * as path from 'path'
import { dataStore } from '../../main/services/dataStore'

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/** Frame analysis from the pipeline */
export interface FrameAnalysis {
  frameId: string
  framePath: string
  timestamp: number
  analysis: {
    description: string
    activities: string[]
    applications: string[]
    keywords: string[]
  }
  processedAt: number
  usedLLM: boolean
}

/** Concentration gate decision */
export interface GateResult {
  frameId: string
  decision: 'CONTINUE' | 'SKIP'
  importance: number
  reason: string
  processedAt: number
}

/** Generated suggestion from a batch */
export interface GeneratedSuggestion {
  id: string
  title: string
  description: string
  approach: string
  keywords: string[]
  supportEvidence: string
  rawSupport: number
  sourceFrames: string[]
  generatedAt: number
}

/** Suggestion generation batch */
export interface SuggestionBatch {
  batchId: string
  frameAnalyses: FrameAnalysis[]
  suggestions: GeneratedSuggestion[]
  generatedAt: number
}

/** Scoring result for a suggestion */
export interface ScoringScores {
  benefit: number
  disruptionCost: number
  missCost: number
  decay: number
  combined: number
}

/** Scored suggestion */
export interface ScoredSuggestion extends GeneratedSuggestion {
  scores: ScoringScores
  filterDecision: {
    passed: boolean
    reason: string
  }
  scoredAt: number
}

/** Scoring batch result */
export interface ScoringResult {
  batchId: string
  inputSuggestions: GeneratedSuggestion[]
  scoredSuggestions: ScoredSuggestion[]
  passedSuggestions: ScoredSuggestion[]
  filteredOut: ScoredSuggestion[]
  scoredAt: number
}

/** Similarity comparison between suggestions */
export interface SuggestionSimilarity {
  suggestion1Id: string
  suggestion2Id: string
  similarity: number
  isDuplicate: boolean
  classification: string
  reason: string
}

/** Deduplication result */
export interface DedupResult {
  batchId: string
  inputSuggestions: ScoredSuggestion[]
  uniqueSuggestions: ScoredSuggestion[]
  duplicatesRemoved: ScoredSuggestion[]
  clusteredInto: Record<string, ScoredSuggestion[]>
  similarities: SuggestionSimilarity[]
  processedAt: number
}

/** Frame summary for list view */
export interface FrameSummary {
  frameId: string
  timestamp: number
  type: 'periodic' | 'before' | 'after'
  hasAnalysis: boolean
  gateDecision?: 'CONTINUE' | 'SKIP'
  contributedToSuggestions: number
}

/** Embedded suggestion info for frame trace */
export interface FrameSuggestionInfo {
  suggestionId: string
  title: string
  description: string
  approach: string
  keywords: string[]
  status: string
  support: number
  rawSupport: number
  scores?: ScoringScores
  filterDecision?: {
    passed: boolean
    reason: string
  }
  deduplication?: {
    isUnique: boolean
    similarities: SuggestionSimilarity[]
  }
}

/** Full frame trace */
export interface FrameTrace {
  frameId: string
  timestamp: number
  screenshotPath: string
  type: 'periodic' | 'before' | 'after'
  analysis?: FrameAnalysis
  gateResult?: GateResult
  contributedTo: string[] // suggestion IDs
  suggestions: FrameSuggestionInfo[] // full suggestion details
}

/** Suggestion summary for list view */
export interface SuggestionSummary {
  suggestionId: string
  title: string
  status: string
  support: number
  createdAt: number
  sourceFrameCount: number
}

/** Full suggestion trace */
export interface SuggestionTrace {
  suggestionId: string
  title: string
  description: string
  approach: string
  keywords: string[]
  status: string
  support: number
  createdAt: number
  sourceFrames: FrameSummary[]
  generation?: {
    batchId: string
    rawSupport: number
    supportEvidence: string
    generatedAt: number
  }
  scoring?: {
    batchId: string
    scores: ScoringScores
    filterDecision: {
      passed: boolean
      reason: string
    }
    scoredAt: number
  }
  deduplication?: {
    batchId: string
    isUnique: boolean
    similarities: SuggestionSimilarity[]
    processedAt: number
  }
}

// =============================================================================
// SERVICE IMPLEMENTATION
// =============================================================================

class EvaluationDataService {
  private frameAnalysisDir: string = ''
  private concentrationGateDir: string = ''
  private suggestionGenerationDir: string = ''
  private scoringFilteringDir: string = ''
  private deduplicationDir: string = ''
  private screenshotsDir: string = ''

  /**
   * Initialize the service with data directories.
   */
  async initialize(): Promise<void> {
    const dataDir = dataStore.getDataDir()
    this.frameAnalysisDir = path.join(dataDir, 'frame_analysis')
    this.concentrationGateDir = path.join(dataDir, 'concentration_gate')
    this.suggestionGenerationDir = path.join(dataDir, 'suggestion_generation')
    this.scoringFilteringDir = path.join(dataDir, 'scoring_filtering')
    this.deduplicationDir = path.join(dataDir, 'deduplication')
    this.screenshotsDir = path.join(dataDir, 'screenshots')
  }

  /**
   * Read all JSON files from a directory.
   */
  private async readJsonFilesFromDir<T>(dirPath: string): Promise<T[]> {
    try {
      if (!fs.existsSync(dirPath)) {
        return []
      }
      const files = await fs.promises.readdir(dirPath)
      const jsonFiles = files.filter((f) => f.endsWith('.json') && !f.startsWith('_'))
      const results: T[] = []

      for (const file of jsonFiles) {
        try {
          const content = await fs.promises.readFile(path.join(dirPath, file), 'utf-8')
          results.push(JSON.parse(content) as T)
        } catch {
          console.warn(`Failed to parse ${file}`)
        }
      }

      return results
    } catch {
      return []
    }
  }

  /**
   * Get all frame analyses from the pipeline.
   */
  async getFrameAnalyses(): Promise<FrameAnalysis[]> {
    return this.readJsonFilesFromDir<FrameAnalysis>(this.frameAnalysisDir)
  }

  /**
   * Get all concentration gate decisions.
   */
  async getConcentrationGateResults(): Promise<GateResult[]> {
    return this.readJsonFilesFromDir<GateResult>(this.concentrationGateDir)
  }

  /**
   * Get all suggestion generation batches.
   */
  async getSuggestionBatches(): Promise<SuggestionBatch[]> {
    return this.readJsonFilesFromDir<SuggestionBatch>(this.suggestionGenerationDir)
  }

  /**
   * Get all scoring results.
   */
  async getScoringResults(): Promise<ScoringResult[]> {
    return this.readJsonFilesFromDir<ScoringResult>(this.scoringFilteringDir)
  }

  /**
   * Get all deduplication results.
   */
  async getDeduplicationResults(): Promise<DedupResult[]> {
    return this.readJsonFilesFromDir<DedupResult>(this.deduplicationDir)
  }

  /**
   * Extract frame type from frame ID.
   */
  private getFrameType(frameId: string): 'periodic' | 'before' | 'after' {
    if (frameId.endsWith('_periodic')) return 'periodic'
    if (frameId.endsWith('_before')) return 'before'
    if (frameId.endsWith('_after')) return 'after'
    return 'periodic'
  }

  /**
   * List all frames with basic metadata.
   */
  async listFrames(): Promise<FrameSummary[]> {
    const [analyses, gateResults, batches] = await Promise.all([
      this.getFrameAnalyses(),
      this.getConcentrationGateResults(),
      this.getSuggestionBatches()
    ])

    // Build maps for quick lookup
    const analysisMap = new Map(analyses.map((a) => [a.frameId, a]))
    const gateMap = new Map(gateResults.map((g) => [g.frameId, g]))

    // Count how many suggestions each frame contributed to
    const frameContributions = new Map<string, number>()
    for (const batch of batches) {
      for (const suggestion of batch.suggestions) {
        for (const frameId of suggestion.sourceFrames) {
          frameContributions.set(frameId, (frameContributions.get(frameId) || 0) + 1)
        }
      }
    }

    // Get all unique frame IDs
    const allFrameIds = new Set<string>()
    analyses.forEach((a) => allFrameIds.add(a.frameId))
    gateResults.forEach((g) => allFrameIds.add(g.frameId))

    // Also check screenshots directory for frames that might not have been analyzed yet
    try {
      if (fs.existsSync(this.screenshotsDir)) {
        const screenshotFiles = await fs.promises.readdir(this.screenshotsDir)
        for (const file of screenshotFiles) {
          if (file.endsWith('.jpg') || file.endsWith('.png')) {
            const frameId = file.replace(/\.(jpg|png)$/, '')
            allFrameIds.add(frameId)
          }
        }
      }
    } catch {
      // Ignore errors
    }

    // Build summaries
    const summaries: FrameSummary[] = []
    for (const frameId of allFrameIds) {
      const analysis = analysisMap.get(frameId)
      const gateResult = gateMap.get(frameId)

      // Extract timestamp from frame ID (format: frame_<timestamp>_<type>)
      const timestampMatch = frameId.match(/frame_(\d+)_/)
      const timestamp = timestampMatch ? parseInt(timestampMatch[1], 10) : 0

      summaries.push({
        frameId,
        timestamp,
        type: this.getFrameType(frameId),
        hasAnalysis: !!analysis,
        gateDecision: gateResult?.decision,
        contributedToSuggestions: frameContributions.get(frameId) || 0
      })
    }

    // Sort by timestamp (newest first)
    summaries.sort((a, b) => b.timestamp - a.timestamp)

    return summaries
  }

  /**
   * List all suggestions with basic metadata.
   */
  async listSuggestions(): Promise<SuggestionSummary[]> {
    const [batches, scoringResults] = await Promise.all([
      this.getSuggestionBatches(),
      this.getScoringResults()
    ])

    // Get current suggestion states from the main dataStore
    const appState = dataStore.getState()
    const suggestionStates = new Map(
      appState.suggestions.map((s) => [s.suggestionId, s])
    )

    // Build map of scored suggestions
    const scoredMap = new Map<string, ScoredSuggestion>()
    for (const result of scoringResults) {
      for (const scored of result.scoredSuggestions) {
        scoredMap.set(scored.id, scored)
      }
    }

    // Collect all generated suggestions
    const summaries: SuggestionSummary[] = []
    for (const batch of batches) {
      for (const suggestion of batch.suggestions) {
        const scored = scoredMap.get(suggestion.id)
        const state = suggestionStates.get(suggestion.id)

        summaries.push({
          suggestionId: suggestion.id,
          title: suggestion.title,
          status: state?.status || 'generated',
          support: scored?.scores?.combined || suggestion.rawSupport / 10,
          createdAt: suggestion.generatedAt,
          sourceFrameCount: suggestion.sourceFrames.length
        })
      }
    }

    // Sort by creation time (newest first)
    summaries.sort((a, b) => b.createdAt - a.createdAt)

    return summaries
  }

  /**
   * Get full pipeline trace for a frame.
   */
  async getFramePipelineTrace(frameId: string): Promise<FrameTrace | null> {
    const [analyses, gateResults, batches, scoringResults, dedupResults] = await Promise.all([
      this.getFrameAnalyses(),
      this.getConcentrationGateResults(),
      this.getSuggestionBatches(),
      this.getScoringResults(),
      this.getDeduplicationResults()
    ])

    const analysis = analyses.find((a) => a.frameId === frameId)
    const gateResult = gateResults.find((g) => g.frameId === frameId)

    // Get current suggestion states from the main dataStore
    const appState = dataStore.getState()
    const suggestionStates = new Map(
      appState.suggestions.map((s) => [s.suggestionId, s])
    )

    // Build scoring map
    const scoredMap = new Map<string, ScoredSuggestion>()
    for (const result of scoringResults) {
      for (const scored of result.scoredSuggestions) {
        scoredMap.set(scored.id, scored)
      }
    }

    // Build dedup map
    const dedupMap = new Map<string, { isUnique: boolean; similarities: SuggestionSimilarity[] }>()
    for (const result of dedupResults) {
      for (const s of result.uniqueSuggestions) {
        const sims = result.similarities.filter(
          (sim) => sim.suggestion1Id === s.id || sim.suggestion2Id === s.id
        )
        dedupMap.set(s.id, { isUnique: true, similarities: sims })
      }
      for (const s of result.duplicatesRemoved) {
        const sims = result.similarities.filter(
          (sim) => sim.suggestion1Id === s.id || sim.suggestion2Id === s.id
        )
        dedupMap.set(s.id, { isUnique: false, similarities: sims })
      }
    }

    // Find suggestions this frame contributed to
    const contributedTo: string[] = []
    const suggestions: FrameSuggestionInfo[] = []

    for (const batch of batches) {
      for (const suggestion of batch.suggestions) {
        if (suggestion.sourceFrames.includes(frameId)) {
          contributedTo.push(suggestion.id)

          const scored = scoredMap.get(suggestion.id)
          const state = suggestionStates.get(suggestion.id)
          const dedup = dedupMap.get(suggestion.id)

          suggestions.push({
            suggestionId: suggestion.id,
            title: state?.title || suggestion.title,
            description: state?.description || suggestion.description,
            approach: state?.approach || suggestion.approach,
            keywords: state?.keywords || suggestion.keywords,
            status: state?.status || 'generated',
            support: state?.support || scored?.scores?.combined || suggestion.rawSupport / 10,
            rawSupport: suggestion.rawSupport,
            scores: scored?.scores,
            filterDecision: scored?.filterDecision,
            deduplication: dedup
          })
        }
      }
    }

    // Extract timestamp from frame ID
    const timestampMatch = frameId.match(/frame_(\d+)_/)
    const timestamp = timestampMatch ? parseInt(timestampMatch[1], 10) : 0

    // Construct screenshot path
    let screenshotPath = ''
    for (const ext of ['.jpg', '.png', '.jpeg']) {
      const possiblePath = path.join(this.screenshotsDir, frameId + ext)
      if (fs.existsSync(possiblePath)) {
        screenshotPath = possiblePath
        break
      }
    }

    return {
      frameId,
      timestamp,
      screenshotPath,
      type: this.getFrameType(frameId),
      analysis,
      gateResult,
      contributedTo,
      suggestions
    }
  }

  /**
   * Get full pipeline trace for a suggestion.
   */
  async getSuggestionPipelineTrace(suggestionId: string): Promise<SuggestionTrace | null> {
    const [batches, scoringResults, dedupResults, frameSummaries] = await Promise.all([
      this.getSuggestionBatches(),
      this.getScoringResults(),
      this.getDeduplicationResults(),
      this.listFrames()
    ])

    // Get current suggestion state
    const appState = dataStore.getState()
    const currentState = appState.suggestions.find((s) => s.suggestionId === suggestionId)

    // Find the generation batch containing this suggestion
    let generatedSuggestion: GeneratedSuggestion | undefined
    let generationBatchId: string | undefined

    for (const batch of batches) {
      const found = batch.suggestions.find((s) => s.id === suggestionId)
      if (found) {
        generatedSuggestion = found
        generationBatchId = batch.batchId
        break
      }
    }

    if (!generatedSuggestion) {
      return null
    }

    // Find scoring result
    let scoredSuggestion: ScoredSuggestion | undefined
    let scoringBatchId: string | undefined

    for (const result of scoringResults) {
      const found = result.scoredSuggestions.find((s) => s.id === suggestionId)
      if (found) {
        scoredSuggestion = found
        scoringBatchId = result.batchId
        break
      }
    }

    // Find deduplication result
    let dedupInfo:
      | {
          batchId: string
          isUnique: boolean
          similarities: SuggestionSimilarity[]
          processedAt: number
        }
      | undefined

    for (const result of dedupResults) {
      const isUnique = result.uniqueSuggestions.some((s) => s.id === suggestionId)
      const isDuplicate = result.duplicatesRemoved.some((s) => s.id === suggestionId)

      if (isUnique || isDuplicate) {
        // Find relevant similarities
        const relevantSimilarities = result.similarities.filter(
          (sim) => sim.suggestion1Id === suggestionId || sim.suggestion2Id === suggestionId
        )

        dedupInfo = {
          batchId: result.batchId,
          isUnique,
          similarities: relevantSimilarities,
          processedAt: result.processedAt
        }
        break
      }
    }

    // Build frame summaries map
    const frameSummaryMap = new Map(frameSummaries.map((f) => [f.frameId, f]))

    // Get source frame summaries
    const sourceFrames: FrameSummary[] = generatedSuggestion.sourceFrames
      .map((frameId) => frameSummaryMap.get(frameId))
      .filter((f): f is FrameSummary => f !== undefined)

    return {
      suggestionId,
      title: currentState?.title || generatedSuggestion.title,
      description: currentState?.description || generatedSuggestion.description,
      approach: currentState?.approach || generatedSuggestion.approach,
      keywords: currentState?.keywords || generatedSuggestion.keywords,
      status: currentState?.status || 'generated',
      support: currentState?.support || scoredSuggestion?.scores?.combined || generatedSuggestion.rawSupport / 10,
      createdAt: generatedSuggestion.generatedAt,
      sourceFrames,
      generation: generationBatchId
        ? {
            batchId: generationBatchId,
            rawSupport: generatedSuggestion.rawSupport,
            supportEvidence: generatedSuggestion.supportEvidence,
            generatedAt: generatedSuggestion.generatedAt
          }
        : undefined,
      scoring: scoringBatchId && scoredSuggestion
        ? {
            batchId: scoringBatchId,
            scores: scoredSuggestion.scores,
            filterDecision: scoredSuggestion.filterDecision,
            scoredAt: scoredSuggestion.scoredAt
          }
        : undefined,
      deduplication: dedupInfo
    }
  }

  /**
   * Get screenshot as base64 data URL.
   */
  async getScreenshot(frameId: string): Promise<string | null> {
    for (const ext of ['.jpg', '.png', '.jpeg']) {
      const screenshotPath = path.join(this.screenshotsDir, frameId + ext)
      if (fs.existsSync(screenshotPath)) {
        try {
          const data = await fs.promises.readFile(screenshotPath)
          const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg'
          return `data:${mimeType};base64,${data.toString('base64')}`
        } catch {
          return null
        }
      }
    }
    return null
  }
}

export const evaluationDataService = new EvaluationDataService()
