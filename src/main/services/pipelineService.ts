import * as fs from 'fs'
import * as path from 'path'
import { dataStore } from './dataStore'
import { screenCaptureService } from './screenCapture'
import { suggestionService } from './suggestionService'

// Pipeline step definitions
interface PipelineStep {
  step: string
  directory: string
}

interface PipelineStatus extends PipelineStep {
  fileCount?: number
  lastProcessed?: number
}

class PipelineService {
  private isRunning = false
  private processInterval: NodeJS.Timeout | null = null
  private pipelineDir: string = ''

  // Pipeline directories for each step
  private readonly PIPELINE_STEPS = [
    '1_raw_frames',
    '2_analyzed',
    '3_suggestions',
    '4_scored',
    '5_deduplicated'
  ]

  private readonly PROCESS_INTERVAL_MS = 10000 // 10 seconds

  async initialize(): Promise<void> {
    // Set up pipeline directory structure
    this.pipelineDir = path.join(dataStore.getDataDir(), 'pipeline')

    // Create all pipeline step directories
    for (const step of this.PIPELINE_STEPS) {
      const stepDir = path.join(this.pipelineDir, step)
      await fs.promises.mkdir(stepDir, { recursive: true })
    }

    console.log('Pipeline directories created at:', this.pipelineDir)
  }

  start(): void {
    if (this.isRunning) return

    console.log('Starting pipeline service')
    this.isRunning = true

    // Start the suggestion service for generating suggestions
    suggestionService.start()

    // Start periodic processing
    this.processInterval = setInterval(() => {
      this.processPipeline()
    }, this.PROCESS_INTERVAL_MS)

    // Process immediately
    this.processPipeline()
  }

  stop(): void {
    if (!this.isRunning) return

    console.log('Stopping pipeline service')
    this.isRunning = false

    suggestionService.stop()

    if (this.processInterval) {
      clearInterval(this.processInterval)
      this.processInterval = null
    }
  }

  getStatus(): PipelineStatus[] {
    return this.PIPELINE_STEPS.map((step, index) => ({
      step: `Step ${index + 1}: ${this.getStepName(index)}`,
      directory: path.join(this.pipelineDir, step)
    }))
  }

  private getStepName(index: number): string {
    const names = [
      'Raw Frames',
      'Frame Analysis',
      'Suggestion Generation',
      'Scoring',
      'Deduplication'
    ]
    return names[index] || 'Unknown'
  }

  private async processPipeline(): Promise<void> {
    if (!this.isRunning) return

    try {
      // Step 1: Copy new screenshots to raw frames
      await this.processRawFrames()

      // Step 2: Analyze frames (placeholder for actual LLM analysis)
      await this.analyzeFrames()

      // Step 3: Generate suggestions (handled by suggestionService)
      // suggestionService runs independently

      // Step 4: Score suggestions (placeholder)
      await this.scoreSuggestions()

      // Step 5: Deduplicate (placeholder)
      await this.deduplicateSuggestions()
    } catch (error) {
      console.error('Pipeline processing error:', error)
    }
  }

  private async processRawFrames(): Promise<void> {
    // Get recent screenshots and link/copy to pipeline
    const screenshots = await screenCaptureService.getRecentScreenshots(5)
    const rawFramesDir = path.join(this.pipelineDir, '1_raw_frames')

    for (const screenshot of screenshots) {
      const filename = path.basename(screenshot)
      const destPath = path.join(rawFramesDir, filename)

      // Only copy if doesn't exist
      try {
        await fs.promises.access(destPath)
      } catch {
        try {
          await fs.promises.copyFile(screenshot, destPath)
        } catch (err) {
          // File may have been deleted, skip
        }
      }
    }
  }

  private async analyzeFrames(): Promise<void> {
    // Placeholder: In production, this would send frames to LLM for analysis
    const rawFramesDir = path.join(this.pipelineDir, '1_raw_frames')
    const analyzedDir = path.join(this.pipelineDir, '2_analyzed')

    try {
      const files = await fs.promises.readdir(rawFramesDir)
      const frameFiles = files.filter(f => f.endsWith('.jpg'))

      for (const file of frameFiles.slice(0, 3)) {
        const analysisFile = file.replace('.jpg', '.json')
        const analysisPath = path.join(analyzedDir, analysisFile)

        // Skip if already analyzed
        try {
          await fs.promises.access(analysisPath)
        } catch {
          // Create placeholder analysis
          const analysis = {
            filename: file,
            analyzedAt: Date.now(),
            context: 'User working on development task',
            applications: ['Code Editor', 'Browser', 'Terminal'],
            activities: ['coding', 'researching', 'testing']
          }
          await fs.promises.writeFile(analysisPath, JSON.stringify(analysis, null, 2))
        }
      }
    } catch (error) {
      // Directory may not exist yet
    }
  }

  private async scoreSuggestions(): Promise<void> {
    // Placeholder: Score suggestions based on relevance
    const scoredDir = path.join(this.pipelineDir, '4_scored')

    const suggestions = dataStore.getActiveSuggestions()
    const scoreData = {
      scoredAt: Date.now(),
      suggestionCount: suggestions.length,
      scores: suggestions.map(s => ({
        id: s.suggestionId,
        score: s.support * (s.utilities?.benefit || 0.5)
      }))
    }

    await fs.promises.writeFile(
      path.join(scoredDir, `scores_${Date.now()}.json`),
      JSON.stringify(scoreData, null, 2)
    )

    // Cleanup old score files (keep last 10)
    await this.cleanupOldFiles(scoredDir, 10)
  }

  private async deduplicateSuggestions(): Promise<void> {
    // Placeholder: Remove duplicate suggestions
    const dedupDir = path.join(this.pipelineDir, '5_deduplicated')

    const suggestions = dataStore.getActiveSuggestions()

    // Simple title-based deduplication tracking
    const seen = new Set<string>()
    const duplicates: string[] = []

    for (const suggestion of suggestions) {
      const key = suggestion.title.toLowerCase().trim()
      if (seen.has(key)) {
        duplicates.push(suggestion.suggestionId)
      } else {
        seen.add(key)
      }
    }

    const dedupData = {
      processedAt: Date.now(),
      totalSuggestions: suggestions.length,
      duplicatesFound: duplicates.length,
      duplicateIds: duplicates
    }

    await fs.promises.writeFile(
      path.join(dedupDir, `dedup_${Date.now()}.json`),
      JSON.stringify(dedupData, null, 2)
    )

    // Cleanup old dedup files
    await this.cleanupOldFiles(dedupDir, 10)
  }

  private async cleanupOldFiles(dir: string, keep: number): Promise<void> {
    try {
      const files = await fs.promises.readdir(dir)
      const jsonFiles = files.filter(f => f.endsWith('.json')).sort()

      if (jsonFiles.length > keep) {
        const toDelete = jsonFiles.slice(0, jsonFiles.length - keep)
        for (const file of toDelete) {
          await fs.promises.unlink(path.join(dir, file))
        }
      }
    } catch {
      // Ignore cleanup errors
    }
  }

  // Get pipeline directory path
  getPipelineDir(): string {
    return this.pipelineDir
  }
}

// Singleton instance
export const pipelineService = new PipelineService()
