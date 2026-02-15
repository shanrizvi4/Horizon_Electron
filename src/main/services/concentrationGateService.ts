/**
 * =============================================================================
 * CONCENTRATION GATE SERVICE
 * =============================================================================
 *
 * Evaluates whether to continue processing a frame based on:
 * - Similarity to recent frames
 * - Importance of the current activity
 *
 * This is Step 2.5 of the suggestion pipeline (between Frame Analysis and
 * Suggestion Generation).
 *
 * PIPELINE POSITION:
 * Screenshots → Frame Analysis → [CONCENTRATION GATE] → Suggestion Generation → Scoring → Deduplication
 *
 * PURPOSE:
 * - Skip processing for similar, low-value frames (social media, idle)
 * - Continue processing for important work (crisis, deadline, learning)
 * - Reduce unnecessary LLM calls and improve signal-to-noise ratio
 *
 * @module services/concentrationGateService
 */

import * as fs from 'fs'
import * as path from 'path'
import { dataStore } from './dataStore'
import { configService } from './config'
import { CONCENTRATION_GATE_PROMPTS } from './prompts'
import type { FrameAnalysis } from './frameAnalysisService'

// =============================================================================
// CONFIGURATION
// =============================================================================

/** Gemini API endpoint for text generation */
const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Result of evaluating a frame through the concentration gate.
 */
export interface ConcentrationResult {
  /** Unique frame identifier */
  frameId: string
  /** Decision: CONTINUE processing or SKIP this frame */
  decision: 'CONTINUE' | 'SKIP'
  /** Importance score 0-1, for future model selection */
  importance: number
  /** Reason for the decision */
  reason: string
  /** When this evaluation was performed */
  processedAt: number
}

// =============================================================================
// CONCENTRATION GATE SERVICE CLASS
// =============================================================================

/**
 * Service for evaluating whether frames should continue through the pipeline.
 *
 * USAGE:
 * ```typescript
 * import { concentrationGateService } from './services/concentrationGateService'
 *
 * // Initialize on startup
 * await concentrationGateService.initialize()
 *
 * // Evaluate a frame
 * const result = await concentrationGateService.evaluate(currentFrame, recentFrames)
 * if (result.decision === 'SKIP') {
 *   return // Stop pipeline for this frame
 * }
 * ```
 */
class ConcentrationGateService {
  /** Directory for storing concentration gate results */
  private gateDir: string = ''

  /** Whether to use real LLM or hardcoded evaluation */
  private useLLM: boolean = false

  // ---------------------------------------------------------------------------
  // Configuration
  // ---------------------------------------------------------------------------

  /**
   * Enables or disables real LLM calls.
   *
   * When disabled, uses hardcoded evaluation for testing.
   */
  setUseLLM(enabled: boolean): void {
    this.useLLM = enabled
    console.log(`Concentration gate LLM mode: ${enabled ? 'ENABLED' : 'DISABLED'}`)
  }

  // ---------------------------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------------------------

  /**
   * Initializes the service.
   *
   * Creates the gate results directory.
   */
  async initialize(): Promise<void> {
    this.gateDir = path.join(dataStore.getDataDir(), 'concentration_gate')
    await fs.promises.mkdir(this.gateDir, { recursive: true })
    console.log('Concentration gate service initialized')
  }

  // ---------------------------------------------------------------------------
  // Evaluation
  // ---------------------------------------------------------------------------

  /**
   * Evaluates whether to continue processing for a frame.
   *
   * @param currentFrame - The current frame analysis to evaluate
   * @param recentFrames - Previous frame analyses for context (last 3-5)
   * @returns Concentration result with decision and importance
   */
  async evaluate(
    currentFrame: FrameAnalysis,
    recentFrames: FrameAnalysis[]
  ): Promise<ConcentrationResult> {
    console.log(`Evaluating concentration gate for frame: ${currentFrame.frameId}`)

    let result: ConcentrationResult

    if (this.useLLM) {
      console.log('\n--- CALLING GEMINI API (Concentration Gate) ---')
      try {
        result = await this.evaluateWithLLM(currentFrame, recentFrames)
        console.log('--- GEMINI RESPONSE RECEIVED ---\n')
      } catch (error) {
        console.error('Concentration gate LLM failed, defaulting to CONTINUE:', error)
        // On error, default to CONTINUE (don't block pipeline)
        result = {
          frameId: currentFrame.frameId,
          decision: 'CONTINUE',
          importance: 0.5,
          reason: 'LLM evaluation failed, defaulting to continue',
          processedAt: Date.now()
        }
      }
    } else {
      console.log('\n--- CONCENTRATION GATE (hardcoded mode) ---')
      result = this.evaluateHardcoded(currentFrame, recentFrames)
    }

    // Save result to disk
    await this.saveResult(result)

    return result
  }

  /**
   * Evaluates using the Gemini LLM.
   */
  private async evaluateWithLLM(
    currentFrame: FrameAnalysis,
    recentFrames: FrameAnalysis[]
  ): Promise<ConcentrationResult> {
    const apiKey = configService.getGeminiApiKey()
    if (!apiKey || apiKey === 'your_api_key_here') {
      throw new Error('GEMINI_API_KEY not configured')
    }

    // Build the prompt
    const systemPrompt = CONCENTRATION_GATE_PROMPTS.system
    const userPrompt = CONCENTRATION_GATE_PROMPTS.user(currentFrame, recentFrames)
    const fullPrompt = `${systemPrompt}\n\n${userPrompt}`

    // Make API call
    const request = {
      contents: [{ parts: [{ text: fullPrompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 512
      }
    }

    console.log('Sending request to Gemini API (Concentration Gate)...')
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
      return {
        frameId: currentFrame.frameId,
        decision: parsed.decision === 'SKIP' ? 'SKIP' : 'CONTINUE',
        importance: Math.max(0, Math.min(1, parsed.importance || 0.5)),
        reason: parsed.reason || 'No reason provided',
        processedAt: Date.now()
      }
    } catch {
      // If JSON parsing fails, try to extract decision from text
      const isSkip = text.toLowerCase().includes('"skip"') || text.toLowerCase().includes('skip')
      return {
        frameId: currentFrame.frameId,
        decision: isSkip ? 'SKIP' : 'CONTINUE',
        importance: 0.5,
        reason: `Parsed from text: ${text.slice(0, 100)}`,
        processedAt: Date.now()
      }
    }
  }

  /**
   * Hardcoded evaluation for testing.
   *
   * Uses simple heuristics based on detected applications and activities.
   */
  private evaluateHardcoded(
    currentFrame: FrameAnalysis,
    recentFrames: FrameAnalysis[]
  ): ConcentrationResult {
    const analysis = currentFrame.analysis

    // Low-value applications (social media, entertainment)
    const lowValueApps = ['twitter', 'facebook', 'instagram', 'tiktok', 'youtube', 'netflix', 'reddit']
    const hasLowValueApp = analysis.applications.some(app =>
      lowValueApps.some(lv => app.toLowerCase().includes(lv))
    )

    // High-value activities (work-related)
    const highValueKeywords = ['coding', 'debugging', 'writing', 'reviewing', 'meeting', 'email', 'document']
    const hasHighValueActivity = analysis.activities.some(act =>
      highValueKeywords.some(hv => act.toLowerCase().includes(hv))
    )

    // Check similarity to recent frames
    let isSimilarToRecent = false
    if (recentFrames.length > 0) {
      const recentApps = recentFrames.flatMap(f => f.analysis.applications)
      const currentApps = analysis.applications
      const overlap = currentApps.filter(app => recentApps.includes(app))
      isSimilarToRecent = overlap.length >= currentApps.length * 0.8
    }

    // Decision logic
    let decision: 'CONTINUE' | 'SKIP' = 'CONTINUE'
    let importance = 0.5
    let reason = ''

    if (hasLowValueApp && isSimilarToRecent) {
      decision = 'SKIP'
      importance = 0.2
      reason = 'Low-value application with similar recent activity'
    } else if (hasHighValueActivity) {
      decision = 'CONTINUE'
      importance = 0.8
      reason = 'High-value work activity detected'
    } else if (isSimilarToRecent && !hasHighValueActivity) {
      decision = 'SKIP'
      importance = 0.3
      reason = 'Similar to recent frames with no high-value activity'
    } else {
      decision = 'CONTINUE'
      importance = 0.5
      reason = 'New activity pattern detected'
    }

    return {
      frameId: currentFrame.frameId,
      decision,
      importance,
      reason,
      processedAt: Date.now()
    }
  }

  // ---------------------------------------------------------------------------
  // Persistence
  // ---------------------------------------------------------------------------

  /**
   * Saves a concentration result to disk.
   */
  private async saveResult(result: ConcentrationResult): Promise<void> {
    const resultPath = path.join(this.gateDir, `gate_${result.frameId}.json`)
    await fs.promises.writeFile(resultPath, JSON.stringify(result, null, 2))
    console.log(`Concentration gate result saved: ${resultPath}`)
  }

  // ---------------------------------------------------------------------------
  // Public Utilities
  // ---------------------------------------------------------------------------

  /**
   * Gets the concentration gate directory path.
   */
  getGateDir(): string {
    return this.gateDir
  }

  /**
   * Gets recent gate results.
   */
  async getRecentResults(limit: number = 10): Promise<ConcentrationResult[]> {
    const results: ConcentrationResult[] = []
    try {
      const files = await fs.promises.readdir(this.gateDir)
      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = await fs.promises.readFile(path.join(this.gateDir, file), 'utf-8')
          results.push(JSON.parse(content))
        }
      }
    } catch (error) {
      console.error('Failed to get gate results:', error)
    }
    return results.sort((a, b) => b.processedAt - a.processedAt).slice(0, limit)
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

/**
 * Singleton instance of the ConcentrationGateService.
 */
export const concentrationGateService = new ConcentrationGateService()
