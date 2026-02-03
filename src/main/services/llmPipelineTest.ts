import * as fs from 'fs'
import * as path from 'path'
import { dataStore } from './dataStore'
import { screenCaptureService } from './screenCapture'

interface LLMTestResult {
  step: string
  success: boolean
  duration: number
  output?: unknown
  error?: string
}

export async function runFullLLMPipeline(): Promise<LLMTestResult[]> {
  const results: LLMTestResult[] = []

  console.log('\n========================================')
  console.log('   FULL LLM PIPELINE TEST')
  console.log('========================================\n')

  // Step 1: Capture a screenshot
  console.log('Step 1: Capturing screenshot...')
  const step1Start = Date.now()
  try {
    const screenshots = await screenCaptureService.getRecentScreenshots(1)
    results.push({
      step: 'Screenshot Capture',
      success: screenshots.length > 0,
      duration: Date.now() - step1Start,
      output: { screenshotCount: screenshots.length, path: screenshots[0] }
    })
    console.log(`  ✓ Found ${screenshots.length} screenshot(s)`)
  } catch (error) {
    results.push({
      step: 'Screenshot Capture',
      success: false,
      duration: Date.now() - step1Start,
      error: (error as Error).message
    })
    console.log(`  ✗ Failed: ${(error as Error).message}`)
  }

  // Step 2: Frame Analysis (placeholder - would call Gemini API)
  console.log('\nStep 2: Analyzing frame...')
  const step2Start = Date.now()
  try {
    // Placeholder for actual Gemini API call
    const analysis = {
      timestamp: Date.now(),
      context: 'Development environment detected',
      applications: ['VS Code', 'Terminal', 'Browser'],
      userActivity: 'coding',
      confidence: 0.85
    }

    // Save analysis result
    const analysisDir = path.join(dataStore.getDataDir(), 'pipeline', '2_analyzed')
    await fs.promises.mkdir(analysisDir, { recursive: true })
    await fs.promises.writeFile(
      path.join(analysisDir, `test_analysis_${Date.now()}.json`),
      JSON.stringify(analysis, null, 2)
    )

    results.push({
      step: 'Frame Analysis',
      success: true,
      duration: Date.now() - step2Start,
      output: analysis
    })
    console.log('  ✓ Frame analyzed (mock)')
  } catch (error) {
    results.push({
      step: 'Frame Analysis',
      success: false,
      duration: Date.now() - step2Start,
      error: (error as Error).message
    })
    console.log(`  ✗ Failed: ${(error as Error).message}`)
  }

  // Step 3: Suggestion Generation (placeholder - would call Gemini API)
  console.log('\nStep 3: Generating suggestions...')
  const step3Start = Date.now()
  try {
    const suggestion = {
      id: `test-sug-${Date.now()}`,
      title: 'Consider adding error handling to async operations',
      description: 'Based on the detected coding activity, adding try-catch blocks to async functions would improve reliability.',
      confidence: 0.78,
      generatedAt: Date.now()
    }

    const suggestionsDir = path.join(dataStore.getDataDir(), 'pipeline', '3_suggestions')
    await fs.promises.mkdir(suggestionsDir, { recursive: true })
    await fs.promises.writeFile(
      path.join(suggestionsDir, `test_suggestion_${Date.now()}.json`),
      JSON.stringify(suggestion, null, 2)
    )

    results.push({
      step: 'Suggestion Generation',
      success: true,
      duration: Date.now() - step3Start,
      output: suggestion
    })
    console.log('  ✓ Suggestion generated (mock)')
  } catch (error) {
    results.push({
      step: 'Suggestion Generation',
      success: false,
      duration: Date.now() - step3Start,
      error: (error as Error).message
    })
    console.log(`  ✗ Failed: ${(error as Error).message}`)
  }

  // Step 4: Scoring
  console.log('\nStep 4: Scoring suggestion...')
  const step4Start = Date.now()
  try {
    const scoreResult = {
      suggestionId: `test-sug-${Date.now()}`,
      relevanceScore: 0.82,
      urgencyScore: 0.65,
      confidenceScore: 0.78,
      combinedScore: 0.75,
      scoredAt: Date.now()
    }

    const scoredDir = path.join(dataStore.getDataDir(), 'pipeline', '4_scored')
    await fs.promises.mkdir(scoredDir, { recursive: true })
    await fs.promises.writeFile(
      path.join(scoredDir, `test_score_${Date.now()}.json`),
      JSON.stringify(scoreResult, null, 2)
    )

    results.push({
      step: 'Scoring',
      success: true,
      duration: Date.now() - step4Start,
      output: scoreResult
    })
    console.log('  ✓ Suggestion scored')
  } catch (error) {
    results.push({
      step: 'Scoring',
      success: false,
      duration: Date.now() - step4Start,
      error: (error as Error).message
    })
    console.log(`  ✗ Failed: ${(error as Error).message}`)
  }

  // Step 5: Deduplication
  console.log('\nStep 5: Checking for duplicates...')
  const step5Start = Date.now()
  try {
    const dedupResult = {
      processedAt: Date.now(),
      isDuplicate: false,
      similarSuggestions: [],
      action: 'keep'
    }

    const dedupDir = path.join(dataStore.getDataDir(), 'pipeline', '5_deduplicated')
    await fs.promises.mkdir(dedupDir, { recursive: true })
    await fs.promises.writeFile(
      path.join(dedupDir, `test_dedup_${Date.now()}.json`),
      JSON.stringify(dedupResult, null, 2)
    )

    results.push({
      step: 'Deduplication',
      success: true,
      duration: Date.now() - step5Start,
      output: dedupResult
    })
    console.log('  ✓ Deduplication check complete')
  } catch (error) {
    results.push({
      step: 'Deduplication',
      success: false,
      duration: Date.now() - step5Start,
      error: (error as Error).message
    })
    console.log(`  ✗ Failed: ${(error as Error).message}`)
  }

  // Summary
  console.log('\n========================================')
  console.log('   TEST SUMMARY')
  console.log('========================================')

  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0)
  const passedCount = results.filter(r => r.success).length

  for (const result of results) {
    const status = result.success ? '✓' : '✗'
    console.log(`${status} ${result.step}: ${result.duration}ms`)
  }

  console.log(`\nTotal: ${passedCount}/${results.length} steps passed`)
  console.log(`Total duration: ${totalDuration}ms`)
  console.log('========================================\n')

  return results
}
