/**
 * End-to-End LLM Pipeline Test
 *
 * Runs all 5 pipeline steps with REAL Gemini LLM calls on a single screenshot.
 * Implements improved logic from gum-backend.
 */

import * as fs from 'fs'
import * as path from 'path'
import { configService } from './config'
import { dataStore } from './dataStore'
import { retrieveAndRerank, extractTimestampSpan } from './retrieval'
import type { Suggestion, Utilities } from '../types'

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

// =============================================================================
// TYPES
// =============================================================================

interface FrameAnalysisResult {
  transcription: string  // Full word-for-word transcription
  applications: string[]
  urls: string[]
  file_paths: string[]
}

interface GeneratedSuggestion {
  title: string
  description: string
  approach: string
  keywords: string[]
  support: number  // 1-10: How much info we have to complete this
  support_evidence: string  // What's missing?
}

interface ScoredSuggestion extends GeneratedSuggestion {
  utilities: {
    benefit: number           // 1-10: How beneficial
    false_positive_cost: number  // 1-10: How disruptive if unnecessary
    false_negative_cost: number  // 1-10: How bad to miss this
    decay: number             // 1-10: How quickly benefit diminishes (10 = stays relevant)
  }
  passed: boolean
  cutoff: number
  support_probability: number
}

type SimilarityClass = 'A' | 'B' | 'C'  // COMBINE_TASK, DIFFERENT_TASK, DIFFERENT_PROJECT

// Maps 1-10 support score to probability (from gum-backend)
const LIKERT_10: Record<number, number> = {
  1: 0.05, 2: 0.15, 3: 0.25, 4: 0.35, 5: 0.45,
  6: 0.55, 7: 0.65, 8: 0.75, 9: 0.85, 10: 0.95
}

// =============================================================================
// GEMINI API HELPER
// =============================================================================

async function callGemini(prompt: string, imageBase64?: string, mimeType?: string): Promise<string> {
  const apiKey = configService.getGeminiApiKey()
  if (!apiKey || apiKey === 'your_api_key_here') {
    throw new Error('GEMINI_API_KEY not configured in config.json')
  }

  const parts: any[] = [{ text: prompt }]

  if (imageBase64 && mimeType) {
    parts.push({
      inline_data: {
        mime_type: mimeType,
        data: imageBase64
      }
    })
  }

  const request = {
    contents: [{ parts }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 4096
    }
  }

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Gemini API error: ${response.status} - ${error}`)
  }

  const result = await response.json()
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('No response from Gemini')

  return text
}

function parseJSON(text: string): any {
  // Extract JSON from markdown code blocks if present
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const jsonText = match ? match[1].trim() : text.trim()
  return JSON.parse(jsonText)
}

// =============================================================================
// STEP 2: FRAME ANALYSIS (Full Transcription)
// =============================================================================

const FRAME_ANALYSIS_PROMPT = `Transcribe in markdown ALL the content from this screenshot of the user's screen.

NEVER SUMMARIZE ANYTHING. You must transcribe everything EXACTLY, word for word. Don't repeat yourself.

Include all:
- Application names visible
- File paths shown
- Website URLs
- Menu items, buttons, and UI elements
- Any text content (code, documents, messages, etc.)

Create a FINAL structured markdown transcription.

Respond ONLY with valid JSON:
{
  "transcription": "Full markdown transcription of everything visible...",
  "applications": ["app1", "app2"],
  "urls": ["https://..."],
  "file_paths": ["/path/to/file"]
}`

async function analyzeFrame(imageBase64: string, mimeType: string): Promise<FrameAnalysisResult> {
  const response = await callGemini(FRAME_ANALYSIS_PROMPT, imageBase64, mimeType)
  return parseJSON(response)
}

// =============================================================================
// STEP 3: SUGGESTION GENERATION (Improved Guidelines + Similar Observations)
// =============================================================================

const SUGGESTION_GENERATION_PROMPT = `You are a helpful AI assistant analyzing what a user is doing on their computer.

## Current Screen Transcription
---
{transcription}
---
{similar_observations_section}
## Your Task

Generate 5 concrete suggestions that could help this user RIGHT NOW based on what you see.

### Guidelines - MUST FOLLOW:
- Provide actionable and SPECIFIC recommendations
- Think beyond what is on the screen - explore additional possibilities
- Include external ideas, best practices, or creative solutions when reasonable
- Use context from similar past observations if available to understand user patterns

### What to AVOID:
- Menial organizational suggestions
- Trivial or self-evident actions (like "click the clearly labeled button")
- Suggestions for things the user is ALREADY doing or in the process of doing
- Suggestions the user or an LLM could not reasonably complete
- Generic high-level suggestions without clear next steps
- Suggestions where you don't have a clear idea of the path to success
- Repeating suggestions that are too similar to what the user has seen recently

### Scoring Support (1-10):
Evaluate how well you could complete each suggestion using available information:
1 = You have almost none of the information needed
10 = You have everything needed to comprehensively complete it

Respond ONLY with valid JSON:
{
  "suggestions": [
    {
      "title": "Highly specific title mentioning exactly where and how you could help",
      "description": "Why this would help the user",
      "approach": "Brief, high-level steps from now to completion. Be specific and ensure each step is achievable.",
      "keywords": ["relevant", "keywords", "for", "retrieval"],
      "support": 7,
      "support_evidence": "What's missing that you'd need? Or 'Nothing - have all needed info'"
    }
  ]
}`

async function generateSuggestions(
  transcription: string,
  similarObservations: string[] = []
): Promise<GeneratedSuggestion[]> {
  // Build similar observations section if we have any
  let similarSection = ''
  if (similarObservations.length > 0) {
    similarSection = `
## Similar Past Observations (for context)
These are relevant past screen observations that may help understand what the user is working on:
---
${similarObservations.map((obs, i) => `### Past Observation ${i + 1}\n${obs.slice(0, 1500)}${obs.length > 1500 ? '...' : ''}`).join('\n\n')}
---

`
  }

  const prompt = SUGGESTION_GENERATION_PROMPT
    .replace('{transcription}', transcription)
    .replace('{similar_observations_section}', similarSection)

  const response = await callGemini(prompt)
  const parsed = parseJSON(response)
  return parsed.suggestions || []
}

// =============================================================================
// STEP 4: SCORING & FILTERING (Utility-Based Formula)
// =============================================================================

const SCORING_PROMPT = `You are evaluating suggestions for a user based on what they're currently doing.

## User's Current Screen
---
{transcription}
---

## Suggestions to Evaluate
{suggestions}

## Scoring Dimensions (1-10 scale for each)

1. **benefit**: How beneficial will this suggestion be if followed?
   - Consider: Is it trivial? Generic? Already being done?
   - 1 = not beneficial, 10 = highly beneficial
   - Be CONSERVATIVE - only high scores for truly valuable suggestions

2. **false_positive_cost**: How disruptive would showing this suggestion be if unnecessary?
   - Consider: Would it interrupt important work? Is it relevant to current focus?
   - 1 = not disruptive, 10 = highly disruptive

3. **false_negative_cost**: How critical is it to show this if they truly need it?
   - Consider: Severity of missing this advice, likelihood of failure without it
   - 1 = no impact, 10 = significant negative impact

4. **decay**: How much does the benefit diminish over time?
   - 1 = must act immediately or becomes obsolete
   - 10 = still useful many hours from now

Respond ONLY with valid JSON:
{
  "scores": [
    {
      "title": "suggestion title",
      "benefit": 7,
      "false_positive_cost": 3,
      "false_negative_cost": 5,
      "decay": 8
    }
  ]
}`

function computeCutoff(utilities: ScoredSuggestion['utilities']): number {
  // From gum-backend: cutoff = fp_cost / (benefit + fp_cost + fn_cost)
  const { benefit, false_positive_cost, false_negative_cost } = utilities
  // Normalize from 1-10 to 0-1 scale
  const b = benefit / 10
  const fp = false_positive_cost / 10
  const fn = false_negative_cost / 10
  return fp / (b + fp + fn + 0.001) // Add small epsilon to avoid division by zero
}

async function scoreSuggestions(
  suggestions: GeneratedSuggestion[],
  transcription: string
): Promise<ScoredSuggestion[]> {
  const suggestionList = suggestions
    .map((s, i) => `${i + 1}. "${s.title}"\n   ${s.description}\n   Approach: ${s.approach}`)
    .join('\n\n')

  const prompt = SCORING_PROMPT
    .replace('{transcription}', transcription)
    .replace('{suggestions}', suggestionList)

  const response = await callGemini(prompt)
  const parsed = parseJSON(response)

  return suggestions.map((s, i) => {
    const scores = parsed.scores?.[i] || {
      benefit: 5,
      false_positive_cost: 5,
      false_negative_cost: 5,
      decay: 5
    }

    const utilities = {
      benefit: scores.benefit,
      false_positive_cost: scores.false_positive_cost,
      false_negative_cost: scores.false_negative_cost,
      decay: scores.decay
    }

    const cutoff = computeCutoff(utilities)
    const support_probability = LIKERT_10[Math.min(10, Math.max(1, s.support))] || 0.5

    // Filter: show if support_probability > cutoff
    const passed = support_probability > cutoff

    return {
      ...s,
      utilities,
      passed,
      cutoff,
      support_probability
    }
  })
}

// =============================================================================
// STEP 5: DEDUPLICATION (Three-Way Classification)
// =============================================================================

const DEDUPLICATION_PROMPT = `Your task is to determine the relationship between two given suggestions.

## Suggestion A (New):
Title: {title_a}
Description: {description_a}
Approach: {approach_a}

## Suggestion B (Existing):
Title: {title_b}
Description: {description_b}
Approach: {approach_b}

## Classification

Classify their relationship into ONE of these categories:

(A) COMBINE_TASK - The suggestions are very similar and should be combined/merged.
    They recommend essentially the same action or address the same problem.

(B) DIFFERENT_TASK - The suggestions are fairly different but might be related
    through a broad, high-level goal. Keep both but note they're related.

(C) DIFFERENT_PROJECT - The suggestions are fundamentally different, belonging
    to separate projects or objectives. Completely distinct.

Respond with ONLY the letter: A, B, or C`

async function classifySimilarity(
  suggestionA: GeneratedSuggestion,
  suggestionB: { title: string; description: string; approach?: string }
): Promise<SimilarityClass> {
  const prompt = DEDUPLICATION_PROMPT
    .replace('{title_a}', suggestionA.title)
    .replace('{description_a}', suggestionA.description)
    .replace('{approach_a}', suggestionA.approach)
    .replace('{title_b}', suggestionB.title)
    .replace('{description_b}', suggestionB.description)
    .replace('{approach_b}', suggestionB.approach || 'N/A')

  const response = await callGemini(prompt)
  const letter = response.trim().toUpperCase().charAt(0)

  if (letter === 'A' || letter === 'B' || letter === 'C') {
    return letter as SimilarityClass
  }
  return 'C' // Default to different project if unclear
}

interface DeduplicationResult {
  unique: ScoredSuggestion[]
  duplicates: Array<{ suggestion: ScoredSuggestion; duplicateOf: string; classification: SimilarityClass }>
  related: Array<{ suggestion: ScoredSuggestion; relatedTo: string }>
}

async function deduplicateSuggestions(
  newSuggestions: ScoredSuggestion[],
  existingSuggestions: Array<{ title: string; description: string; suggestionId: string }>
): Promise<DeduplicationResult> {
  const unique: ScoredSuggestion[] = []
  const duplicates: DeduplicationResult['duplicates'] = []
  const related: DeduplicationResult['related'] = []

  for (const suggestion of newSuggestions) {
    let dominated = false
    let relatedTo: string | null = null

    // Check against existing suggestions
    for (const existing of existingSuggestions) {
      const classification = await classifySimilarity(suggestion, existing)

      if (classification === 'A') {
        // COMBINE_TASK - this is a duplicate
        duplicates.push({
          suggestion,
          duplicateOf: existing.suggestionId,
          classification
        })
        dominated = true
        break
      } else if (classification === 'B') {
        // DIFFERENT_TASK - related but keep both
        relatedTo = existing.suggestionId
      }
      // C = DIFFERENT_PROJECT - no relation
    }

    if (dominated) continue

    // Check against other new suggestions we've already accepted
    for (const accepted of unique) {
      const classification = await classifySimilarity(suggestion, {
        title: accepted.title,
        description: accepted.description,
        approach: accepted.approach
      })

      if (classification === 'A') {
        duplicates.push({
          suggestion,
          duplicateOf: accepted.title,
          classification
        })
        dominated = true
        break
      }
    }

    if (!dominated) {
      if (relatedTo) {
        related.push({ suggestion, relatedTo })
      }
      unique.push(suggestion)
    }
  }

  return { unique, duplicates, related }
}

// =============================================================================
// TRANSCRIPTION CORPUS (for retrieval)
// =============================================================================

interface TranscriptionEntry {
  filename: string
  transcription: string
  timestamp: number
}

/**
 * Load all past transcriptions from frame_analysis directory
 */
async function loadTranscriptionCorpus(frameAnalysisDir: string): Promise<TranscriptionEntry[]> {
  const entries: TranscriptionEntry[] = []

  try {
    const files = await fs.promises.readdir(frameAnalysisDir)
    const jsonFiles = files.filter(f => f.endsWith('.json'))

    for (const file of jsonFiles) {
      try {
        const content = await fs.promises.readFile(path.join(frameAnalysisDir, file), 'utf-8')
        const data = JSON.parse(content)

        // Handle different formats of stored transcriptions
        const transcription = data.analysis?.transcription || data.transcription || ''
        if (!transcription) continue

        // Extract timestamp from filename or data
        const timestampSpan = extractTimestampSpan(file)
        const timestamp = timestampSpan ? timestampSpan[0] : (data.timestamp || Date.now())

        entries.push({
          filename: file,
          transcription,
          timestamp
        })
      } catch {
        // Skip invalid files
      }
    }

    // Sort by timestamp (most recent first for recency decay)
    entries.sort((a, b) => b.timestamp - a.timestamp)
  } catch {
    // Directory doesn't exist yet, return empty
  }

  return entries
}

/**
 * Retrieve similar past observations using BM25 + MMR
 */
function retrieveSimilarObservations(
  currentTranscription: string,
  corpus: TranscriptionEntry[],
  topN: number = 3
): string[] {
  if (corpus.length === 0) {
    return []
  }

  const transcriptions = corpus.map(e => e.transcription)
  const timestamps = corpus.map(e => e.timestamp)

  const [selectedDocs] = retrieveAndRerank(transcriptions, currentTranscription, {
    lambdaParam: 0.3,  // Balance relevance (0.3) and diversity (0.7)
    topN,
    timestamps,
    alpha: 0.05  // Gentle recency decay
  })

  return selectedDocs
}

// =============================================================================
// MAIN PIPELINE
// =============================================================================

export async function runFullLLMPipeline(): Promise<void> {
  console.log('\n' + '='.repeat(70))
  console.log('    END-TO-END LLM PIPELINE (gum-backend improvements)')
  console.log('    All steps use REAL Gemini API calls')
  console.log('='.repeat(70) + '\n')

  const dataDir = dataStore.getDataDir()
  const screenshotsDir = path.join(dataDir, 'screenshots')

  // Find the screenshot
  const files = await fs.promises.readdir(screenshotsDir)
  const imageFiles = files.filter(f => /\.(jpg|jpeg|png)$/i.test(f))

  if (imageFiles.length === 0) {
    console.error('No screenshot found in data/screenshots/')
    return
  }

  const imageName = imageFiles[0]
  const imagePath = path.join(screenshotsDir, imageName)
  console.log(`Using screenshot: ${imageName}\n`)

  // Read and encode image
  const imageBuffer = await fs.promises.readFile(imagePath)
  const imageBase64 = imageBuffer.toString('base64')
  const mimeType = imageName.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg'

  // ========================================
  // LOAD TRANSCRIPTION CORPUS (for retrieval)
  // ========================================
  const frameAnalysisDir = path.join(dataDir, 'frame_analysis')
  await fs.promises.mkdir(frameAnalysisDir, { recursive: true })

  console.log('[STEP 1.5] Loading past transcriptions for retrieval...')
  const transcriptionCorpus = await loadTranscriptionCorpus(frameAnalysisDir)
  console.log(`  Loaded ${transcriptionCorpus.length} past transcriptions`)

  // ========================================
  // STEP 2: FRAME ANALYSIS (Full Transcription)
  // ========================================
  console.log('\n[STEP 2] Frame Analysis - Full Transcription...')

  let frameAnalysis: FrameAnalysisResult
  try {
    frameAnalysis = await analyzeFrame(imageBase64, mimeType)
    console.log('✓ Frame Analysis complete')
    console.log(`  Transcription length: ${frameAnalysis.transcription.length} chars`)
    console.log(`  Applications: ${frameAnalysis.applications.join(', ') || 'none detected'}`)
    console.log(`  URLs: ${frameAnalysis.urls.length} found`)
    console.log(`  File paths: ${frameAnalysis.file_paths.length} found`)
  } catch (error) {
    console.error('✗ Frame Analysis failed:', error)
    return
  }

  // Save frame analysis
  await fs.promises.writeFile(
    path.join(frameAnalysisDir, `llm_test_${Date.now()}.json`),
    JSON.stringify({ imagePath, analysis: frameAnalysis, usedLLM: true, timestamp: Date.now() }, null, 2)
  )

  // ========================================
  // STEP 2.5: RETRIEVE SIMILAR OBSERVATIONS
  // ========================================
  console.log('\n[STEP 2.5] Retrieving similar past observations (BM25 + MMR)...')

  const similarObservations = retrieveSimilarObservations(
    frameAnalysis.transcription,
    transcriptionCorpus,
    3  // Get top 3 similar observations
  )

  if (similarObservations.length > 0) {
    console.log(`  Found ${similarObservations.length} similar past observations`)
    similarObservations.forEach((obs, i) => {
      console.log(`    ${i + 1}. ${obs.slice(0, 80).replace(/\n/g, ' ')}...`)
    })
  } else {
    console.log('  No past observations found (first run)')
  }

  // ========================================
  // STEP 3: SUGGESTION GENERATION (with similar observations context)
  // ========================================
  console.log('\n[STEP 3] Suggestion Generation (with retrieval context)...')

  let suggestions: GeneratedSuggestion[]
  try {
    suggestions = await generateSuggestions(frameAnalysis.transcription, similarObservations)
    console.log('✓ Suggestion Generation complete')
    console.log(`  Generated ${suggestions.length} suggestions:`)
    suggestions.forEach((s, i) => {
      console.log(`    ${i + 1}. "${s.title}" (support: ${s.support}/10)`)
      if (s.support_evidence && s.support_evidence !== 'Nothing - have all needed info') {
        console.log(`       Missing: ${s.support_evidence.slice(0, 60)}...`)
      }
    })
  } catch (error) {
    console.error('✗ Suggestion Generation failed:', error)
    return
  }

  // Save suggestion generation
  const suggestionDir = path.join(dataDir, 'suggestion_generation')
  await fs.promises.mkdir(suggestionDir, { recursive: true })
  await fs.promises.writeFile(
    path.join(suggestionDir, `llm_test_${Date.now()}.json`),
    JSON.stringify({ suggestions, usedLLM: true }, null, 2)
  )

  // ========================================
  // STEP 4: SCORING & FILTERING (Utility-Based)
  // ========================================
  console.log('\n[STEP 4] Scoring & Filtering (utility-based formula)...')

  let scoredSuggestions: ScoredSuggestion[]
  try {
    scoredSuggestions = await scoreSuggestions(suggestions, frameAnalysis.transcription)
    console.log('✓ Scoring complete')
    scoredSuggestions.forEach(s => {
      const u = s.utilities
      console.log(`    "${s.title}"`)
      console.log(`       benefit=${u.benefit} fp_cost=${u.false_positive_cost} fn_cost=${u.false_negative_cost} decay=${u.decay}`)
      console.log(`       support_prob=${s.support_probability.toFixed(2)} cutoff=${s.cutoff.toFixed(2)} → ${s.passed ? 'PASSED' : 'FILTERED'}`)
    })
  } catch (error) {
    console.error('✗ Scoring failed:', error)
    return
  }

  // Save scoring
  const scoringDir = path.join(dataDir, 'scoring_filtering')
  await fs.promises.mkdir(scoringDir, { recursive: true })
  await fs.promises.writeFile(
    path.join(scoringDir, `llm_test_${Date.now()}.json`),
    JSON.stringify({ scoredSuggestions, usedLLM: true }, null, 2)
  )

  const passedSuggestions = scoredSuggestions.filter(s => s.passed)
  console.log(`\n  ${passedSuggestions.length}/${scoredSuggestions.length} suggestions passed filtering`)

  if (passedSuggestions.length === 0) {
    console.log('No suggestions passed filtering. Done.')
    return
  }

  // ========================================
  // STEP 5: DEDUPLICATION (Three-Way Classification)
  // ========================================
  console.log('\n[STEP 5] Deduplication (three-way: COMBINE/DIFFERENT_TASK/DIFFERENT_PROJECT)...')

  const existingSuggestions = dataStore.getActiveSuggestions().map(s => ({
    title: s.title,
    description: s.description,
    suggestionId: s.suggestionId
  }))

  let dedupResult: DeduplicationResult
  try {
    dedupResult = await deduplicateSuggestions(passedSuggestions, existingSuggestions)
    console.log('✓ Deduplication complete')
    console.log(`  Unique: ${dedupResult.unique.length}`)
    console.log(`  Duplicates (A): ${dedupResult.duplicates.length}`)
    console.log(`  Related (B): ${dedupResult.related.length}`)

    if (dedupResult.duplicates.length > 0) {
      dedupResult.duplicates.forEach(d => {
        console.log(`    "${d.suggestion.title}" → duplicate of "${d.duplicateOf}"`)
      })
    }
  } catch (error) {
    console.error('✗ Deduplication failed:', error)
    return
  }

  // Save deduplication
  const dedupDir = path.join(dataDir, 'deduplication')
  await fs.promises.mkdir(dedupDir, { recursive: true })
  await fs.promises.writeFile(
    path.join(dedupDir, `llm_test_${Date.now()}.json`),
    JSON.stringify({
      unique: dedupResult.unique,
      duplicates: dedupResult.duplicates,
      related: dedupResult.related,
      usedLLM: true
    }, null, 2)
  )

  // ========================================
  // FINAL: Add to state.json for frontend
  // ========================================
  console.log('\n[FINAL] Adding suggestions to frontend...')

  let projectId = 1
  const projects = dataStore.getActiveProjects()
  if (projects.length === 0) {
    dataStore.addProject({
      projectId: 1,
      title: 'LLM Generated Suggestions',
      goal: 'Suggestions from AI analysis',
      status: 'active',
      suggestions: [],
      createdAt: Date.now()
    })
  } else {
    projectId = projects[0].projectId
  }

  for (const s of dedupResult.unique) {
    const now = Date.now()
    const suggestion: Suggestion = {
      suggestionId: `llm_${now}_${Math.random().toString(36).slice(2, 8)}`,
      projectId,
      title: s.title,
      description: s.description,
      initialPrompt: `Help me with: ${s.title}`,
      status: 'active',
      keywords: s.keywords,
      approach: s.approach,
      executionOutput: '',
      executionSummary: { title: s.title.slice(0, 30), description: s.support_evidence || 'From LLM analysis' },
      support: s.support / 10, // Normalize to 0-1
      utilities: {
        taskNumber: 0,
        benefit: s.utilities.benefit / 10,
        falsePositiveCost: s.utilities.false_positive_cost / 10,
        falseNegativeCost: s.utilities.false_negative_cost / 10,
        decay: s.utilities.decay / 10
      } as Utilities,
      grounding: [frameAnalysis.transcription.slice(0, 500) + '...'],
      createdAt: now,
      updatedAt: now
    }

    dataStore.addSuggestion(suggestion)
    console.log(`  ✓ Added: "${suggestion.title}"`)
  }

  console.log('\n' + '='.repeat(70))
  console.log('    PIPELINE COMPLETE!')
  console.log(`    ${dedupResult.unique.length} suggestions added to frontend`)
  console.log('='.repeat(70) + '\n')
}
