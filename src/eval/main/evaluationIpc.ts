/**
 * =============================================================================
 * EVALUATION IPC HANDLERS
 * =============================================================================
 *
 * IPC handlers for the Evaluation page. Provides access to pipeline data
 * including frames, suggestions, and their full traces through the pipeline.
 *
 * @module ipc/evaluation
 */

import { ipcMain } from 'electron'
import {
  evaluationDataService,
  type FrameSummary,
  type FrameTrace,
  type SuggestionSummary,
  type SuggestionTrace
} from './evaluationDataService'

// =============================================================================
// IPC CHANNEL NAMES
// =============================================================================

export const EVALUATION_CHANNELS = {
  /** List all frames with basic metadata */
  LIST_FRAMES: 'evaluation:listFrames',
  /** List all suggestions with basic metadata */
  LIST_SUGGESTIONS: 'evaluation:listSuggestions',
  /** Get full pipeline trace for a frame */
  GET_FRAME_TRACE: 'evaluation:getFrameTrace',
  /** Get full pipeline trace for a suggestion */
  GET_SUGGESTION_TRACE: 'evaluation:getSuggestionTrace',
  /** Get screenshot as base64 data URL */
  GET_SCREENSHOT: 'evaluation:getScreenshot'
} as const

// =============================================================================
// HANDLER REGISTRATION
// =============================================================================

/**
 * Registers all evaluation-related IPC handlers.
 */
export function registerEvaluationHandlers(): void {
  // ---------------------------------------------------------------------------
  // LIST FRAMES
  // ---------------------------------------------------------------------------
  ipcMain.handle(
    EVALUATION_CHANNELS.LIST_FRAMES,
    async (): Promise<FrameSummary[]> => {
      return evaluationDataService.listFrames()
    }
  )

  // ---------------------------------------------------------------------------
  // LIST SUGGESTIONS
  // ---------------------------------------------------------------------------
  ipcMain.handle(
    EVALUATION_CHANNELS.LIST_SUGGESTIONS,
    async (): Promise<SuggestionSummary[]> => {
      return evaluationDataService.listSuggestions()
    }
  )

  // ---------------------------------------------------------------------------
  // GET FRAME TRACE
  // ---------------------------------------------------------------------------
  ipcMain.handle(
    EVALUATION_CHANNELS.GET_FRAME_TRACE,
    async (_event, frameId: string): Promise<FrameTrace | null> => {
      return evaluationDataService.getFramePipelineTrace(frameId)
    }
  )

  // ---------------------------------------------------------------------------
  // GET SUGGESTION TRACE
  // ---------------------------------------------------------------------------
  ipcMain.handle(
    EVALUATION_CHANNELS.GET_SUGGESTION_TRACE,
    async (_event, suggestionId: string): Promise<SuggestionTrace | null> => {
      return evaluationDataService.getSuggestionPipelineTrace(suggestionId)
    }
  )

  // ---------------------------------------------------------------------------
  // GET SCREENSHOT
  // ---------------------------------------------------------------------------
  ipcMain.handle(
    EVALUATION_CHANNELS.GET_SCREENSHOT,
    async (_event, frameId: string): Promise<string | null> => {
      return evaluationDataService.getScreenshot(frameId)
    }
  )

  console.log('Evaluation IPC handlers registered')
}
