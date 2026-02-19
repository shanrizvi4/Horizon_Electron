/**
 * =============================================================================
 * FRAME ANALYSIS SERVICE
 * =============================================================================
 *
 * Analyzes screenshots using the Gemini Vision API to understand user activity.
 * This is Step 2 of the suggestion pipeline.
 *
 * PIPELINE POSITION:
 * Screenshots → [FRAME ANALYSIS] → Suggestion Generation → Scoring → Deduplication
 *
 * FEATURES:
 * - Watches for new screenshots and analyzes them via Gemini Vision API
 * - Persists analysis results to disk
 * - Single-frame test mode for debugging
 *
 * @module services/frameAnalysisService
 */

import * as fs from 'fs'
import * as path from 'path'
import { dataStore } from '../core/dataStore'
import { configService } from '../core/config'
import { FRAME_ANALYSIS_PROMPTS } from './prompts'

// =============================================================================
// CONFIGURATION
// =============================================================================

/** Gemini Vision API endpoint */
const GEMINI_VISION_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

/** How often to check for new frames (milliseconds) */
const PROCESS_INTERVAL_MS = 10000

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Result of analyzing a single frame.
 */
export interface FrameAnalysis {
  /** Unique frame identifier (from filename) */
  frameId: string
  /** Full path to the screenshot file */
  framePath: string
  /** Unix timestamp of when the frame was captured */
  timestamp: number
  /** Extracted analysis data */
  analysis: {
    /** Natural language description of what's on screen */
    description: string
    /** List of detected user activities */
    activities: string[]
    /** List of detected applications */
    applications: string[]
    /** Extracted keywords for search/matching */
    keywords: string[]
  }
  /** When this analysis was performed */
  processedAt: number
}

// =============================================================================
// FRAME ANALYSIS SERVICE CLASS
// =============================================================================

/**
 * Service for analyzing screenshots using vision AI.
 *
 * USAGE:
 * ```typescript
 * import { frameAnalysisService } from './services/frameAnalysisService'
 *
 * // Initialize on startup
 * await frameAnalysisService.initialize()
 *
 * // Start watching for new frames
 * frameAnalysisService.start()
 *
 * // Get recent analyses
 * const analyses = await frameAnalysisService.getRecentAnalyses(5)
 * ```
 */
class FrameAnalysisService {
  /** Directory for storing analysis results */
  private analysisDir: string = ''

  /** Whether the service is running */
  private isRunning = false

  /** Interval for checking new frames */
  private processInterval: NodeJS.Timeout | null = null

  /** Set of already processed frame IDs */
  private processedFrames: Set<string> = new Set()

  /** Lock to prevent concurrent processing */
  private isProcessing: boolean = false

  // ---------------------------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------------------------

  /**
   * Initializes the service.
   *
   * Creates the analysis directory and loads previously processed frames.
   */
  async initialize(): Promise<void> {
    this.analysisDir = path.join(dataStore.getDataDir(), 'frame_analysis')
    await fs.promises.mkdir(this.analysisDir, { recursive: true })
    await this.loadProcessedFrames()
  }

  /**
   * Loads the set of already processed frames from disk.
   */
  private async loadProcessedFrames(): Promise<void> {
    try {
      const files = await fs.promises.readdir(this.analysisDir)
      for (const file of files) {
        if (file.endsWith('.json')) {
          this.processedFrames.add(file.replace('.json', ''))
        }
      }
      console.log(`Loaded ${this.processedFrames.size} processed frames`)
    } catch (error) {
      console.error('Failed to load processed frames:', error)
    }
  }

  // ---------------------------------------------------------------------------
  // Start / Stop
  // ---------------------------------------------------------------------------

  /**
   * Starts the frame analysis service.
   *
   * Begins periodically checking for new screenshots to analyze.
   */
  start(): void {
    if (this.isRunning) return
    console.log('Starting frame analysis service')
    this.isRunning = true
    this.processInterval = setInterval(() => this.processNewFrames(), PROCESS_INTERVAL_MS)
  }

  /**
   * Stops the frame analysis service.
   */
  stop(): void {
    if (!this.isRunning) return
    console.log('Stopping frame analysis service')
    this.isRunning = false
    if (this.processInterval) {
      clearInterval(this.processInterval)
      this.processInterval = null
    }
  }

  // ---------------------------------------------------------------------------
  // Frame Processing
  // ---------------------------------------------------------------------------

  /**
   * Processes any new frames that haven't been analyzed yet.
   */
  private async processNewFrames(): Promise<void> {
    // Prevent concurrent processing
    if (this.isProcessing) {
      console.log('Frame analysis already in progress, skipping...')
      return
    }

    this.isProcessing = true
    try {
      const screenshotsDir = dataStore.getScreenshotsDir()
      const files = await fs.promises.readdir(screenshotsDir)

      const frameFiles = files
        .filter((f) => f.startsWith('frame_') && f.endsWith('.jpg'))
        .filter((f) => !this.processedFrames.has(f.replace('.jpg', '')))
        .sort()

      for (const frameFile of frameFiles) {
        // Mark as processed BEFORE analyzing to prevent duplicates
        const frameId = frameFile.replace('.jpg', '')
        this.processedFrames.add(frameId)
        await this.analyzeFrame(frameFile)
      }
    } catch (error) {
      console.error('Error processing new frames:', error)
    } finally {
      this.isProcessing = false
    }
  }

  /**
   * Analyzes a single frame.
   */
  private async analyzeFrame(frameFile: string): Promise<void> {
    const frameId = frameFile.replace('.jpg', '')
    const framePath = path.join(dataStore.getScreenshotsDir(), frameFile)

    // Extract timestamp from filename
    const timestampMatch = frameFile.match(/frame_(\d+)/)
    const timestamp = timestampMatch ? parseInt(timestampMatch[1]) : Date.now()

    console.log(`Analyzing frame: ${frameFile}`)

    console.log('\n--- CALLING GEMINI VISION API ---')
    const analysis = await this.analyzeWithGemini(framePath)
    console.log('--- GEMINI RESPONSE RECEIVED ---\n')

    const frameAnalysis: FrameAnalysis = {
      frameId,
      framePath,
      timestamp,
      analysis,
      processedAt: Date.now()
    }

    // Save to disk
    const analysisPath = path.join(this.analysisDir, `${frameId}.json`)
    await fs.promises.writeFile(analysisPath, JSON.stringify(frameAnalysis, null, 2))

    this.processedFrames.add(frameId)
    console.log(`Frame analysis saved: ${analysisPath}`)
  }

  // ---------------------------------------------------------------------------
  // Gemini Vision API
  // ---------------------------------------------------------------------------

  /**
   * Analyzes an image using the Gemini Vision API.
   */
  private async analyzeWithGemini(framePath: string): Promise<FrameAnalysis['analysis']> {
    const apiKey = configService.getGeminiApiKey()
    if (!apiKey || apiKey === 'your_api_key_here') {
      throw new Error('GEMINI_API_KEY not configured')
    }

    // Read image and convert to base64
    const imageBuffer = await fs.promises.readFile(framePath)
    const base64Image = imageBuffer.toString('base64')

    // Detect mime type
    const ext = framePath.toLowerCase().split('.').pop()
    const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg'

    // Build request
    const request = {
      contents: [
        {
          parts: [
            {
              text: `${FRAME_ANALYSIS_PROMPTS.system}\n\n${FRAME_ANALYSIS_PROMPTS.user(framePath)}`
            },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Image
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 4096
      }
    }

    console.log('Sending request to Gemini Vision API...')
    const url = `${GEMINI_VISION_API_URL}?key=${apiKey}`

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
      // Handle both "transcription" (new prompt) and "description" (old format)
      const transcription = parsed.transcription || parsed.description || 'No transcription'
      return {
        description: transcription,
        activities: parsed.activities || [],
        applications: parsed.applications || [],
        keywords: [
          ...(parsed.keywords || []),
          ...(parsed.urls || []),
          ...(parsed.filePaths || [])
        ]
      }
    } catch {
      // Extract what we can from text
      return {
        description: text.slice(0, 500),
        activities: ['unknown'],
        applications: ['unknown'],
        keywords: ['analysis', 'pending']
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Public Utilities
  // ---------------------------------------------------------------------------

  /**
   * Gets all stored analyses.
   */
  async getAllAnalyses(): Promise<FrameAnalysis[]> {
    const analyses: FrameAnalysis[] = []
    try {
      const files = await fs.promises.readdir(this.analysisDir)
      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = await fs.promises.readFile(path.join(this.analysisDir, file), 'utf-8')
          analyses.push(JSON.parse(content))
        }
      }
    } catch (error) {
      console.error('Failed to get analyses:', error)
    }
    return analyses.sort((a, b) => b.timestamp - a.timestamp)
  }

  /**
   * Gets the most recent analyses.
   */
  async getRecentAnalyses(limit: number = 10): Promise<FrameAnalysis[]> {
    const all = await this.getAllAnalyses()
    return all.slice(0, limit)
  }

  /**
   * Gets the analysis directory path.
   */
  getAnalysisDir(): string {
    return this.analysisDir
  }

  /**
   * Tests LLM analysis on a single frame.
   *
   * Used for debugging and verifying API connectivity.
   */
  async testSingleFrameWithLLM(): Promise<FrameAnalysis | null> {
    console.log('\n' + '='.repeat(60))
    console.log('SINGLE FRAME LLM TEST')
    console.log('='.repeat(60))

    const screenshotsDir = dataStore.getScreenshotsDir()

    // Ensure directory exists
    try {
      await fs.promises.mkdir(screenshotsDir, { recursive: true })
    } catch {
      // ignore
    }

    let files: string[]
    try {
      files = await fs.promises.readdir(screenshotsDir)
    } catch {
      console.error('Screenshots directory not found')
      return null
    }

    // Accept any image file
    const imageFiles = files
      .filter((f) => /\.(jpg|jpeg|png)$/i.test(f))
      .sort()
      .reverse()

    if (imageFiles.length === 0) {
      console.error('No screenshots found in:', screenshotsDir)
      return null
    }

    const latestFrame = imageFiles[0]
    const frameId = latestFrame.replace(/\.(jpg|jpeg|png)$/i, '')
    const framePath = path.join(screenshotsDir, latestFrame)

    console.log(`Testing with image: ${latestFrame}`)

    // Check for API key
    const apiKey = configService.getGeminiApiKey()
    if (!apiKey || apiKey === 'your_api_key_here') {
      console.error('ERROR: GEMINI_API_KEY not configured')
      return null
    }

    const timestampMatch = latestFrame.match(/(\d{10,})/)
    const timestamp = timestampMatch ? parseInt(timestampMatch[1]) : Date.now()

    console.log('\nCalling Gemini Vision API...')
    const startTime = Date.now()

    try {
      const analysis = await this.analyzeWithGemini(framePath)
      const elapsed = Date.now() - startTime

      console.log('\n' + '-'.repeat(40))
      console.log('LLM ANALYSIS RESULT:')
      console.log('-'.repeat(40))
      console.log('Description:', analysis.description)
      console.log('Activities:', analysis.activities.join(', '))
      console.log('Applications:', analysis.applications.join(', '))
      console.log('Keywords:', analysis.keywords.join(', '))
      console.log(`Time taken: ${elapsed}ms`)
      console.log('='.repeat(60) + '\n')

      const frameAnalysis: FrameAnalysis = {
        frameId,
        framePath,
        timestamp,
        analysis,
        processedAt: Date.now()
      }

      const analysisPath = path.join(this.analysisDir, `${frameId}.json`)
      await fs.promises.writeFile(analysisPath, JSON.stringify(frameAnalysis, null, 2))

      this.processedFrames.add(frameId)
      return frameAnalysis
    } catch (error) {
      console.error('LLM TEST FAILED:', error)
      return null
    }
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const frameAnalysisService = new FrameAnalysisService()
