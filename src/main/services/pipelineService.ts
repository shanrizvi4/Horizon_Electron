/**
 * =============================================================================
 * PIPELINE SERVICE
 * =============================================================================
 *
 * Orchestrates the suggestion generation pipeline.
 *
 * PIPELINE STEPS:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  STEP 1: SCREENSHOTS                                                    │
 * │  ┌─────────────────────────────────────────────────────────────────┐   │
 * │  │  Source: screenCaptureService                                   │   │
 * │  │  Output: data/screenshots/frame_<timestamp>.jpg                 │   │
 * │  │  Trigger: Mouse activity, periodic (30s)                        │   │
 * │  └─────────────────────────────────────────────────────────────────┘   │
 * │                              │                                          │
 * │                              ▼                                          │
 * │  STEP 2: FRAME ANALYSIS                                                 │
 * │  ┌─────────────────────────────────────────────────────────────────┐   │
 * │  │  Source: frameAnalysisService                                   │   │
 * │  │  Output: data/frame_analysis/analysis_<timestamp>.json          │   │
 * │  │  Process: Vision LLM transcribes screen content                 │   │
 * │  └─────────────────────────────────────────────────────────────────┘   │
 * │                              │                                          │
 * │                              ▼                                          │
 * │  STEP 2.5: CONCENTRATION GATE                                           │
 * │  ┌─────────────────────────────────────────────────────────────────┐   │
 * │  │  Source: concentrationGateService                               │   │
 * │  │  Output: data/concentration_gate/gate_<frameId>.json            │   │
 * │  │  Process: Decide CONTINUE/SKIP based on similarity & importance │   │
 * │  └─────────────────────────────────────────────────────────────────┘   │
 * │                              │                                          │
 * │                    (if SKIP) ├──────────────────> STOP                  │
 * │                              │                                          │
 * │                   (if CONTINUE)                                         │
 * │                              ▼                                          │
 * │  STEP 3: SUGGESTION GENERATION                                          │
 * │  ┌─────────────────────────────────────────────────────────────────┐   │
 * │  │  Source: suggestionGenerationService                            │   │
 * │  │  Output: data/suggestion_generation/generation_<timestamp>.json │   │
 * │  │  Process: LLM generates task suggestions from analyses          │   │
 * │  └─────────────────────────────────────────────────────────────────┘   │
 * │                              │                                          │
 * │                              ▼                                          │
 * │  STEP 4: SCORING & FILTERING                                            │
 * │  ┌─────────────────────────────────────────────────────────────────┐   │
 * │  │  Source: scoringFilteringService                                │   │
 * │  │  Output: data/scoring_filtering/scoring_<timestamp>.json        │   │
 * │  │  Process: Score by relevance, filter low-quality suggestions    │   │
 * │  └─────────────────────────────────────────────────────────────────┘   │
 * │                              │                                          │
 * │                              ▼                                          │
 * │  STEP 5: DEDUPLICATION                                                  │
 * │  ┌─────────────────────────────────────────────────────────────────┐   │
 * │  │  Source: deduplicationService                                   │   │
 * │  │  Output: data/deduplication/dedup_<timestamp>.json              │   │
 * │  │  Process: Remove duplicates of existing suggestions             │   │
 * │  └─────────────────────────────────────────────────────────────────┘   │
 * │                              │                                          │
 * │                              ▼                                          │
 * │  FINAL OUTPUT                                                           │
 * │  ┌─────────────────────────────────────────────────────────────────┐   │
 * │  │  Unique suggestions added to data/state.json                    │   │
 * │  │  UI updates via state:onUpdate IPC event                        │   │
 * │  └─────────────────────────────────────────────────────────────────┘   │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * TIMING:
 * - Pipeline runs every 60 seconds when active
 * - First run 15 seconds after start (allow some frames to accumulate)
 *
 * @module services/pipelineService
 */

import { dataStore } from './dataStore'
import { frameAnalysisService } from './frameAnalysisService'
import { concentrationGateService } from './concentrationGateService'
import { suggestionGenerationService } from './suggestionGenerationService'
import { scoringFilteringService } from './scoringFilteringService'
import { deduplicationService } from './deduplicationService'
import type { Suggestion, Utilities } from '../types'

// =============================================================================
// CONFIGURATION
// =============================================================================

/** Interval between pipeline runs (milliseconds) */
const PIPELINE_INTERVAL_MS = 15000 // 15 seconds

/** Delay before first pipeline run (milliseconds) */
const INITIAL_RUN_DELAY_MS = 5000 // 5 seconds

// =============================================================================
// PIPELINE SERVICE CLASS
// =============================================================================

/**
 * Orchestrates the suggestion generation pipeline.
 *
 * USAGE:
 * ```typescript
 * import { pipelineService } from './services/pipelineService'
 *
 * // Initialize during app startup
 * await pipelineService.initialize()
 *
 * // Start pipeline when recording starts
 * pipelineService.start()
 *
 * // Stop pipeline when recording stops
 * pipelineService.stop()
 * ```
 */
class PipelineService {
  // ---------------------------------------------------------------------------
  // Private State
  // ---------------------------------------------------------------------------

  /** Whether the pipeline is currently running */
  private isRunning = false

  /** Interval handle for periodic pipeline runs */
  private pipelineInterval: NodeJS.Timeout | null = null

  // ---------------------------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------------------------

  /**
   * Initializes all pipeline services.
   *
   * Must be called during app startup before start().
   */
  async initialize(): Promise<void> {
    // Initialize each step's service
    await frameAnalysisService.initialize()
    await concentrationGateService.initialize()
    await suggestionGenerationService.initialize()
    await scoringFilteringService.initialize()
    await deduplicationService.initialize()

    console.log('Pipeline service initialized')
  }

  // ---------------------------------------------------------------------------
  // Start / Stop
  // ---------------------------------------------------------------------------

  /**
   * Starts the pipeline.
   *
   * - Starts frame analysis background processing
   * - Schedules periodic pipeline runs
   * - Runs first pipeline after short delay
   */
  start(): void {
    if (this.isRunning) return

    console.log('Starting pipeline service')
    this.isRunning = true

    // Start frame analysis service (watches for new screenshots)
    frameAnalysisService.start()

    // Run pipeline periodically
    this.pipelineInterval = setInterval(() => this.runPipeline(), PIPELINE_INTERVAL_MS)

    // Run once after initial delay (let some frames accumulate first)
    setTimeout(() => this.runPipeline(), INITIAL_RUN_DELAY_MS)
  }

  /**
   * Stops the pipeline.
   *
   * - Stops frame analysis
   * - Clears periodic run interval
   */
  stop(): void {
    if (!this.isRunning) return

    console.log('Stopping pipeline service')
    this.isRunning = false

    // Stop frame analysis
    frameAnalysisService.stop()

    // Clear interval
    if (this.pipelineInterval) {
      clearInterval(this.pipelineInterval)
      this.pipelineInterval = null
    }
  }

  // ---------------------------------------------------------------------------
  // Pipeline Execution
  // ---------------------------------------------------------------------------

  /**
   * Runs the full suggestion generation pipeline.
   *
   * Steps:
   * 1. Check for screenshots (captured by screenCaptureService)
   * 2. Get recent frame analyses
   * 3. Generate suggestions from analyses
   * 4. Score and filter suggestions
   * 5. Deduplicate against existing suggestions
   * 6. Add unique suggestions to state
   */
  async runPipeline(): Promise<void> {
    console.log('\n========== RUNNING PIPELINE ==========')
    console.log(`Time: ${new Date().toISOString()}`)

    try {
      // -----------------------------------------------------------------------
      // Step 1: Screenshots
      // -----------------------------------------------------------------------
      console.log('\n[Step 1] Screenshots: Captured by screenCaptureService')
      console.log(`  Location: ${dataStore.getScreenshotsDir()}`)

      // -----------------------------------------------------------------------
      // Step 2: Frame Analysis
      // -----------------------------------------------------------------------
      console.log('\n[Step 2] Frame Analysis')
      console.log(`  Location: ${frameAnalysisService.getAnalysisDir()}`)
      const recentAnalyses = await frameAnalysisService.getRecentAnalyses(5)
      console.log(`  Recent analyses: ${recentAnalyses.length}`)

      // -----------------------------------------------------------------------
      // Step 2.5: Concentration Gate
      // -----------------------------------------------------------------------
      console.log('\n[Step 2.5] Concentration Gate')
      console.log(`  Location: ${concentrationGateService.getGateDir()}`)

      if (recentAnalyses.length === 0) {
        console.log('  No frames to evaluate')
        console.log('========== PIPELINE COMPLETE ==========\n')
        return
      }

      const concentrationResult = await concentrationGateService.evaluate(
        recentAnalyses[0], // Current frame
        recentAnalyses.slice(1) // Previous frames for context
      )
      console.log(`  Decision: ${concentrationResult.decision}`)
      console.log(`  Importance: ${concentrationResult.importance.toFixed(2)}`)
      console.log(`  Reason: ${concentrationResult.reason}`)

      if (concentrationResult.decision === 'SKIP') {
        console.log('\n  Concentration gate: SKIP - stopping pipeline for this frame')
        console.log('========== PIPELINE COMPLETE (SKIPPED) ==========\n')
        return
      }

      // -----------------------------------------------------------------------
      // Step 3: Suggestion Generation
      // -----------------------------------------------------------------------
      console.log('\n[Step 3] Suggestion Generation')
      console.log(`  Location: ${suggestionGenerationService.getGenerationDir()}`)
      const generationResult = await suggestionGenerationService.generateFromRecentFrames()

      if (!generationResult) {
        console.log('  No new suggestions generated (no new frames)')
        console.log('========== PIPELINE COMPLETE ==========\n')
        return
      }
      console.log(`  Generated: ${generationResult.suggestions.length} suggestions`)

      // -----------------------------------------------------------------------
      // Step 4: Scoring & Filtering
      // -----------------------------------------------------------------------
      console.log('\n[Step 4] Scoring & Filtering')
      console.log(`  Location: ${scoringFilteringService.getScoringDir()}`)
      const scoringResult = await scoringFilteringService.scoreSuggestions(
        generationResult.suggestions
      )
      console.log(
        `  Passed: ${scoringResult.passedSuggestions.length}, Filtered: ${scoringResult.filteredOut.length}`
      )

      // -----------------------------------------------------------------------
      // Step 5: Deduplication
      // -----------------------------------------------------------------------
      console.log('\n[Step 5] Deduplication')
      console.log(`  Location: ${deduplicationService.getDeduplicationDir()}`)
      const dedupResult = await deduplicationService.deduplicateSuggestions(
        scoringResult.passedSuggestions
      )
      console.log(
        `  Unique: ${dedupResult.uniqueSuggestions.length}, Duplicates: ${dedupResult.duplicatesRemoved.length}`
      )

      // -----------------------------------------------------------------------
      // Final: Add to State
      // -----------------------------------------------------------------------
      console.log('\n[Final] Adding to state.json')
      for (const scoredSuggestion of dedupResult.uniqueSuggestions) {
        const suggestion = this.convertToSuggestion(scoredSuggestion)
        dataStore.addSuggestion(suggestion)
        console.log(`  Added: ${suggestion.title}`)
      }

      console.log('========== PIPELINE COMPLETE ==========\n')
    } catch (error) {
      console.error('Pipeline error:', error)
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Converts a scored suggestion to the full Suggestion type.
   *
   * @param scored - Scored suggestion from pipeline
   * @returns Full Suggestion object for storage
   */
  private convertToSuggestion(
    scored: import('./scoringFilteringService').ScoredSuggestion
  ): Suggestion {
    const now = Date.now()
    const projectId = this.getOrCreateProject()

    // Build utility metrics from LLM scores
    const utilities: Utilities = {
      taskNumber: parseInt(scored.id.split('_').pop() || '0'),
      benefit: scored.scores.benefit,
      falsePositiveCost: scored.scores.disruptionCost,
      falseNegativeCost: scored.scores.missCost,
      decay: scored.scores.decay
    }

    return {
      suggestionId: scored.id,
      projectId,
      title: scored.title,
      description: scored.description,
      initialPrompt: `Help me with: ${scored.title}`,
      status: 'active',
      keywords: scored.keywords,
      approach: scored.approach,
      executionOutput: '',
      executionSummary: { title: scored.title.slice(0, 30), description: 'Pending' },
      support: scored.scores.combined,
      utilities,
      grounding: scored.supportEvidence,
      createdAt: now,
      updatedAt: now
    }
  }

  /**
   * Gets an existing project or creates a default one.
   *
   * Suggestions need to be assigned to a project. This ensures
   * there's always at least one project available.
   *
   * @returns Project ID to use
   */
  private getOrCreateProject(): number {
    const projects = dataStore.getActiveProjects()

    // Use existing project if available
    if (projects.length > 0) {
      return projects[0].projectId
    }

    // Create default project
    const projectId = 1
    dataStore.addProject({
      projectId,
      title: 'Auto-Generated Suggestions',
      goal: 'Suggestions generated from activity analysis',
      status: 'active',
      suggestions: [],
      createdAt: Date.now()
    })

    return projectId
  }

  // ---------------------------------------------------------------------------
  // Public Utilities
  // ---------------------------------------------------------------------------

  /**
   * Manually triggers a pipeline run.
   *
   * Useful for testing or when user requests immediate analysis.
   */
  async triggerPipeline(): Promise<void> {
    await this.runPipeline()
  }

  /**
   * Gets status information for all pipeline directories.
   *
   * Useful for debugging and displaying pipeline health.
   *
   * @returns Array of step names and their output directories
   */
  getStatus(): { step: string; directory: string }[] {
    return [
      { step: '1. Screenshots', directory: dataStore.getScreenshotsDir() },
      { step: '2. Frame Analysis', directory: frameAnalysisService.getAnalysisDir() },
      { step: '2.5. Concentration Gate', directory: concentrationGateService.getGateDir() },
      { step: '3. Suggestion Generation', directory: suggestionGenerationService.getGenerationDir() },
      { step: '4. Scoring & Filtering', directory: scoringFilteringService.getScoringDir() },
      { step: '5. Deduplication', directory: deduplicationService.getDeduplicationDir() }
    ]
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

/**
 * Singleton instance of the PipelineService.
 *
 * @example
 * ```typescript
 * import { pipelineService } from './services/pipelineService'
 *
 * // Initialize on app start
 * await pipelineService.initialize()
 *
 * // Start when recording begins
 * pipelineService.start()
 *
 * // Manual trigger for testing
 * await pipelineService.triggerPipeline()
 * ```
 */
export const pipelineService = new PipelineService()
