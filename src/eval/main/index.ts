/**
 * Evaluation Module - Main Process Entry Point
 *
 * Exports all evaluation-related main process functionality.
 */

export { evaluationDataService } from './evaluationDataService'
export { registerEvaluationHandlers, EVALUATION_CHANNELS } from './evaluationIpc'

// Re-export types
export type {
  FrameAnalysis,
  GateResult,
  GeneratedSuggestion,
  SuggestionBatch,
  ScoringScores,
  ScoredSuggestion,
  ScoringResult,
  SuggestionSimilarity,
  DedupResult,
  FrameSummary,
  FrameTrace,
  SuggestionSummary,
  SuggestionTrace
} from './evaluationDataService'
