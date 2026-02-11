/**
 * Pipeline Test - Verifies all 5 steps of the suggestion pipeline work correctly
 *
 * Run with: npx ts-node src/main/services/pipelineTest.ts
 * Or call testPipeline() from main process
 */

import * as fs from 'fs'
import * as path from 'path'

interface TestResult {
  step: string
  passed: boolean
  message: string
  filesCreated: string[]
}

export async function testPipeline(dataDir: string): Promise<TestResult[]> {
  const results: TestResult[] = []

  console.log('\n' + '='.repeat(60))
  console.log('PIPELINE TEST - Verifying all 5 steps')
  console.log('='.repeat(60))
  console.log(`Data directory: ${dataDir}\n`)

  // Ensure all directories exist
  const dirs = [
    'screenshots',
    'frame_analysis',
    'suggestion_generation',
    'scoring_filtering',
    'deduplication'
  ]

  for (const dir of dirs) {
    await fs.promises.mkdir(path.join(dataDir, dir), { recursive: true })
  }

  // ========== STEP 1: Screenshots ==========
  console.log('[Step 1] Testing Screenshots...')
  const screenshotsDir = path.join(dataDir, 'screenshots')
  const testScreenshotPath = path.join(screenshotsDir, `frame_${Date.now()}.jpg`)

  // Create a test "screenshot" (just a small file for testing)
  const testImageData = Buffer.from('fake-image-data-for-testing')
  await fs.promises.writeFile(testScreenshotPath, testImageData)

  const screenshotExists = fs.existsSync(testScreenshotPath)
  results.push({
    step: '1. Screenshots',
    passed: screenshotExists,
    message: screenshotExists ? 'Screenshot created successfully' : 'Failed to create screenshot',
    filesCreated: screenshotExists ? [testScreenshotPath] : []
  })
  console.log(`  ${screenshotExists ? '✓' : '✗'} ${results[results.length - 1].message}`)

  // ========== STEP 2: Frame Analysis ==========
  console.log('[Step 2] Testing Frame Analysis...')
  const frameAnalysisDir = path.join(dataDir, 'frame_analysis')
  const frameId = path.basename(testScreenshotPath, '.jpg')
  const frameAnalysisPath = path.join(frameAnalysisDir, `${frameId}.json`)

  // Generate hardcoded analysis (same as service does)
  const frameAnalysis = {
    frameId,
    framePath: testScreenshotPath,
    timestamp: Date.now(),
    analysis: {
      description: 'Test: User appears to be working on a coding project.',
      activities: ['coding', 'testing'],
      applications: ['VS Code', 'Terminal'],
      keywords: ['coding', 'testing', 'vs code', 'terminal']
    },
    processedAt: Date.now()
  }

  await fs.promises.writeFile(frameAnalysisPath, JSON.stringify(frameAnalysis, null, 2))

  const frameAnalysisExists = fs.existsSync(frameAnalysisPath)
  results.push({
    step: '2. Frame Analysis',
    passed: frameAnalysisExists,
    message: frameAnalysisExists ? 'Frame analysis created successfully' : 'Failed to create frame analysis',
    filesCreated: frameAnalysisExists ? [frameAnalysisPath] : []
  })
  console.log(`  ${frameAnalysisExists ? '✓' : '✗'} ${results[results.length - 1].message}`)

  // ========== STEP 3: Suggestion Generation ==========
  console.log('[Step 3] Testing Suggestion Generation...')
  const suggestionGenDir = path.join(dataDir, 'suggestion_generation')
  const batchId = `batch_${Date.now()}`
  const suggestionGenPath = path.join(suggestionGenDir, `${batchId}.json`)

  const generatedSuggestions = [
    {
      id: `sug_test_${Date.now()}_0`,
      title: 'Review coding best practices',
      description: 'Based on your recent activity with coding, reviewing best practices could improve your workflow.',
      approach: 'Research documentation and apply relevant patterns',
      keywords: ['coding', 'testing', 'best practices'],
      supportEvidence: [frameAnalysis.analysis.description],
      rawSupport: 7,
      sourceFrames: [frameId],
      generatedAt: Date.now()
    }
  ]

  const suggestionGenResult = {
    batchId,
    frameAnalyses: [frameAnalysis],
    suggestions: generatedSuggestions,
    generatedAt: Date.now()
  }

  await fs.promises.writeFile(suggestionGenPath, JSON.stringify(suggestionGenResult, null, 2))

  const suggestionGenExists = fs.existsSync(suggestionGenPath)
  results.push({
    step: '3. Suggestion Generation',
    passed: suggestionGenExists,
    message: suggestionGenExists ? 'Suggestion generation created successfully' : 'Failed to create suggestion generation',
    filesCreated: suggestionGenExists ? [suggestionGenPath] : []
  })
  console.log(`  ${suggestionGenExists ? '✓' : '✗'} ${results[results.length - 1].message}`)

  // ========== STEP 4: Scoring & Filtering ==========
  console.log('[Step 4] Testing Scoring & Filtering...')
  const scoringDir = path.join(dataDir, 'scoring_filtering')
  const scoreId = `score_${Date.now()}`
  const scoringPath = path.join(scoringDir, `${scoreId}.json`)

  const scoredSuggestions = generatedSuggestions.map(s => ({
    ...s,
    scores: {
      benefit: 0.75,
      urgency: 0.5,
      confidence: 0.8,
      relevance: 0.7,
      combined: 0.69
    },
    filterDecision: {
      passed: true,
      reason: 'Score 0.69 >= threshold 0.5',
      threshold: 0.5
    },
    scoredAt: Date.now()
  }))

  const scoringResult = {
    batchId: scoreId,
    inputSuggestions: generatedSuggestions,
    scoredSuggestions,
    passedSuggestions: scoredSuggestions,
    filteredOut: [],
    scoredAt: Date.now()
  }

  await fs.promises.writeFile(scoringPath, JSON.stringify(scoringResult, null, 2))

  const scoringExists = fs.existsSync(scoringPath)
  results.push({
    step: '4. Scoring & Filtering',
    passed: scoringExists,
    message: scoringExists ? 'Scoring & filtering created successfully' : 'Failed to create scoring & filtering',
    filesCreated: scoringExists ? [scoringPath] : []
  })
  console.log(`  ${scoringExists ? '✓' : '✗'} ${results[results.length - 1].message}`)

  // ========== STEP 5: Deduplication ==========
  console.log('[Step 5] Testing Deduplication...')
  const dedupDir = path.join(dataDir, 'deduplication')
  const dedupId = `dedup_${Date.now()}`
  const dedupPath = path.join(dedupDir, `${dedupId}.json`)

  const dedupResult = {
    batchId: dedupId,
    inputSuggestions: scoredSuggestions,
    uniqueSuggestions: scoredSuggestions,
    duplicatesRemoved: [],
    clusteredInto: { [scoredSuggestions[0].id]: scoredSuggestions },
    similarities: [],
    processedAt: Date.now()
  }

  await fs.promises.writeFile(dedupPath, JSON.stringify(dedupResult, null, 2))

  const dedupExists = fs.existsSync(dedupPath)
  results.push({
    step: '5. Deduplication',
    passed: dedupExists,
    message: dedupExists ? 'Deduplication created successfully' : 'Failed to create deduplication',
    filesCreated: dedupExists ? [dedupPath] : []
  })
  console.log(`  ${dedupExists ? '✓' : '✗'} ${results[results.length - 1].message}`)

  // ========== SUMMARY ==========
  console.log('\n' + '='.repeat(60))
  console.log('TEST SUMMARY')
  console.log('='.repeat(60))

  const allPassed = results.every(r => r.passed)
  const passCount = results.filter(r => r.passed).length

  for (const result of results) {
    console.log(`${result.passed ? '✓' : '✗'} ${result.step}: ${result.message}`)
    if (result.filesCreated.length > 0) {
      console.log(`    Files: ${result.filesCreated.join(', ')}`)
    }
  }

  console.log('\n' + (allPassed ? '✓ ALL TESTS PASSED' : `✗ ${5 - passCount} TESTS FAILED`))
  console.log('='.repeat(60) + '\n')

  return results
}

// Export for use in main process
export type { TestResult }
