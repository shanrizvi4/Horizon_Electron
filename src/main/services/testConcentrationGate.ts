/**
 * Test script for Frame Analysis + Concentration Gate with real LLM calls
 *
 * Run with: npx ts-node src/main/services/testConcentrationGate.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

// Load .env file from project root
dotenv.config({ path: path.join(__dirname, '../../../.env') })

// Mock electron app for configService
const mockApp = {
  getPath: (name: string) => {
    if (name === 'userData') {
      return path.join(__dirname, '../../../data')
    }
    return '/tmp'
  }
}

// @ts-ignore - Mock electron before imports
global.require = ((id: string) => {
  if (id === 'electron') {
    return { app: mockApp }
  }
  return require(id)
}) as any

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { configService as _configService } from './config'
import { FRAME_ANALYSIS_PROMPTS, CONCENTRATION_GATE_PROMPTS } from './prompts'
import type { FrameAnalysis } from './frameAnalysisService'

// =============================================================================
// CONFIG
// =============================================================================

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'
const SCREENSHOTS_DIR = path.join(__dirname, '../../../data/screenshots')

// =============================================================================
// HELPERS
// =============================================================================

async function analyzeFrameWithLLM(imagePath: string): Promise<FrameAnalysis['analysis']> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY or GOOGLE_API_KEY environment variable required')
  }

  const imageBuffer = await fs.promises.readFile(imagePath)
  const base64Image = imageBuffer.toString('base64')
  const ext = imagePath.toLowerCase().split('.').pop()
  const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg'

  const prompt = `${FRAME_ANALYSIS_PROMPTS.system}\n\n${FRAME_ANALYSIS_PROMPTS.user(imagePath)}`

  const request = {
    contents: [{
      parts: [
        { text: prompt },
        { inline_data: { mime_type: mimeType, data: base64Image } }
      ]
    }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 1024 }
  }

  console.log('  Calling Gemini Vision API...')
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
  if (!text) throw new Error('No text in Gemini response')

  // Parse JSON from response
  let jsonText = text
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) jsonText = jsonMatch[1].trim()

  try {
    const parsed = JSON.parse(jsonText)
    return {
      description: parsed.description || 'No description',
      activities: parsed.activities || [],
      applications: parsed.applications || [],
      keywords: parsed.keywords || []
    }
  } catch {
    return {
      description: text.slice(0, 200),
      activities: ['unknown'],
      applications: ['unknown'],
      keywords: ['analysis', 'pending']
    }
  }
}

async function evaluateConcentrationGate(
  currentFrame: FrameAnalysis,
  recentFrames: FrameAnalysis[]
): Promise<{ decision: string; importance: number; reason: string }> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY or GOOGLE_API_KEY environment variable required')
  }

  const systemPrompt = CONCENTRATION_GATE_PROMPTS.system
  const userPrompt = CONCENTRATION_GATE_PROMPTS.user(currentFrame, recentFrames)
  const fullPrompt = `${systemPrompt}\n\n${userPrompt}`

  const request = {
    contents: [{ parts: [{ text: fullPrompt }] }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 512 }
  }

  console.log('  Calling Gemini API for concentration gate...')
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
  if (!text) throw new Error('No text in Gemini response')

  // Parse JSON from response
  let jsonText = text
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) jsonText = jsonMatch[1].trim()

  try {
    const parsed = JSON.parse(jsonText)
    return {
      decision: parsed.decision || 'CONTINUE',
      importance: Math.max(0, Math.min(1, parsed.importance || 0.5)),
      reason: parsed.reason || 'No reason provided'
    }
  } catch {
    return {
      decision: 'CONTINUE',
      importance: 0.5,
      reason: `Parse error: ${text.slice(0, 100)}`
    }
  }
}

// =============================================================================
// MAIN TEST
// =============================================================================

async function runTest() {
  console.log('\n' + '='.repeat(70))
  console.log('CONCENTRATION GATE TEST - Real LLM Calls')
  console.log('='.repeat(70))

  // Find images
  const images = ['image1.png', 'image2.png', 'image3.png']
  const frameAnalyses: FrameAnalysis[] = []

  // Step 1: Analyze each frame
  console.log('\n' + '-'.repeat(70))
  console.log('STEP 2: FRAME ANALYSIS')
  console.log('-'.repeat(70))

  for (const image of images) {
    const imagePath = path.join(SCREENSHOTS_DIR, image)

    if (!fs.existsSync(imagePath)) {
      console.log(`\n[${image}] NOT FOUND - skipping`)
      continue
    }

    console.log(`\n[${image}]`)
    console.log(`  Path: ${imagePath}`)

    try {
      const analysis = await analyzeFrameWithLLM(imagePath)

      const frameAnalysis: FrameAnalysis = {
        frameId: image.replace('.png', ''),
        framePath: imagePath,
        timestamp: Date.now(),
        analysis,
        processedAt: Date.now(),
        usedLLM: true
      }
      frameAnalyses.push(frameAnalysis)

      console.log(`  Description: ${analysis.description}`)
      console.log(`  Activities: ${analysis.activities.join(', ')}`)
      console.log(`  Applications: ${analysis.applications.join(', ')}`)
      console.log(`  Keywords: ${analysis.keywords.join(', ')}`)
    } catch (error) {
      console.log(`  ERROR: ${error}`)
    }
  }

  if (frameAnalyses.length === 0) {
    console.log('\nNo frames analyzed. Exiting.')
    return
  }

  // Step 2: Run concentration gate on each frame
  console.log('\n' + '-'.repeat(70))
  console.log('STEP 2.5: CONCENTRATION GATE')
  console.log('-'.repeat(70))

  for (let i = 0; i < frameAnalyses.length; i++) {
    const currentFrame = frameAnalyses[i]
    const recentFrames = frameAnalyses.slice(0, i) // Previous frames as context

    console.log(`\n[${currentFrame.frameId}]`)
    console.log(`  Context: ${recentFrames.length} previous frames`)

    try {
      const result = await evaluateConcentrationGate(currentFrame, recentFrames)

      console.log(`  Decision: ${result.decision}`)
      console.log(`  Importance: ${result.importance.toFixed(2)}`)
      console.log(`  Reason: ${result.reason}`)
    } catch (error) {
      console.log(`  ERROR: ${error}`)
    }
  }

  console.log('\n' + '='.repeat(70))
  console.log('TEST COMPLETE')
  console.log('='.repeat(70) + '\n')
}

// Run the test
runTest().catch(console.error)
