import * as fs from 'fs'
import * as path from 'path'
import { dataStore } from './dataStore'
import { configService } from './config'
import { ScoredSuggestion } from './scoringFilteringService'
import { DEDUPLICATION_PROMPTS, formatSuggestionForPrompt } from './prompts'

/** Gemini API endpoint for text generation */
const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

export interface DeduplicationResult {
  batchId: string
  inputSuggestions: ScoredSuggestion[]
  uniqueSuggestions: ScoredSuggestion[]
  duplicatesRemoved: Array<{
    suggestion: ScoredSuggestion
    duplicateOf: string // ID of the suggestion it's a duplicate of
    similarityScore: number
  }>
  clusteredInto: Map<string, ScoredSuggestion[]> // Grouped by similarity
  processedAt: number
}

interface SimilarityPair {
  suggestion1Id: string
  suggestion2Id: string
  similarity: number
  isDuplicate: boolean
  classification: string
  categoryMatch: boolean
  keywordOverlap: string[]
  suggestion1Keywords: string[]
  suggestion2Keywords: string[]
  semanticSimilarity: number
  reason: string
}

class DeduplicationService {
  private deduplicationDir: string = ''

  async initialize(): Promise<void> {
    this.deduplicationDir = path.join(dataStore.getDataDir(), 'deduplication')
    await fs.promises.mkdir(this.deduplicationDir, { recursive: true })
  }

  async deduplicateSuggestions(suggestions: ScoredSuggestion[]): Promise<DeduplicationResult> {
    if (suggestions.length === 0) {
      return {
        batchId: `dedup_${Date.now()}`,
        inputSuggestions: [],
        uniqueSuggestions: [],
        duplicatesRemoved: [],
        clusteredInto: new Map(),
        processedAt: Date.now()
      }
    }

    console.log(`Deduplicating ${suggestions.length} suggestions`)

    const batchId = `dedup_${Date.now()}`

    // Also compare against existing suggestions in dataStore
    const existingSuggestions = dataStore.getActiveSuggestions()

    console.log('\n--- CALLING GEMINI API (Deduplication) ---')
    const { unique, duplicates, similarities } = await this.deduplicateWithLLM(
      suggestions,
      existingSuggestions.map(s => ({
        id: s.suggestionId,
        title: s.title,
        description: s.description,
        keywords: s.keywords
      }))
    )
    console.log('--- GEMINI RESPONSE RECEIVED ---\n')

    // Build clusters
    const clusters = new Map<string, ScoredSuggestion[]>()
    for (const s of unique) {
      clusters.set(s.id, [s])
    }
    for (const dup of duplicates) {
      const existing = clusters.get(dup.duplicateOf) || []
      existing.push(dup.suggestion)
      clusters.set(dup.duplicateOf, existing)
    }

    const result: DeduplicationResult = {
      batchId,
      inputSuggestions: suggestions,
      uniqueSuggestions: unique,
      duplicatesRemoved: duplicates,
      clusteredInto: clusters,
      processedAt: Date.now()
    }

    // Save to disk (convert Map to object for JSON)
    const resultForJson = {
      ...result,
      clusteredInto: Object.fromEntries(result.clusteredInto),
      similarities // Include similarity pairs for debugging
    }
    const resultPath = path.join(this.deduplicationDir, `${batchId}.json`)
    await fs.promises.writeFile(resultPath, JSON.stringify(resultForJson, null, 2))
    console.log(`Deduplication result saved: ${resultPath}`)
    console.log(`  Unique: ${unique.length}, Duplicates removed: ${duplicates.length}`)

    return result
  }

  /**
   * Deduplicates suggestions using the Gemini LLM.
   */
  private async deduplicateWithLLM(
    newSuggestions: ScoredSuggestion[],
    existingSuggestions: Array<{ id: string; title: string; description: string; keywords: string[] }>
  ): Promise<{
    unique: ScoredSuggestion[]
    duplicates: Array<{ suggestion: ScoredSuggestion; duplicateOf: string; similarityScore: number }>
    similarities: SimilarityPair[]
  }> {
    const apiKey = configService.getGeminiApiKey()
    if (!apiKey || apiKey === 'your_api_key_here') {
      throw new Error('GEMINI_API_KEY not configured')
    }

    const unique: ScoredSuggestion[] = []
    const duplicates: Array<{ suggestion: ScoredSuggestion; duplicateOf: string; similarityScore: number }> = []
    const similarities: SimilarityPair[] = []

    for (const suggestion of newSuggestions) {
      let isDuplicate = false
      let highestSimilarity = 0
      let mostSimilarId = ''

      // Check against existing suggestions in dataStore
      for (const existing of existingSuggestions) {
        const sug1 = formatSuggestionForPrompt(suggestion)
        const sug2 = formatSuggestionForPrompt({
          title: existing.title,
          description: existing.description,
          keywords: existing.keywords
        })

        const systemPrompt = DEDUPLICATION_PROMPTS.system
        const userPrompt = DEDUPLICATION_PROMPTS.user(sug1, sug2)
        const fullPrompt = `${systemPrompt}\n\n${userPrompt}`

        const request = {
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 256
          }
        }

        console.log(`Comparing: "${suggestion.title.slice(0, 30)}..." vs "${existing.title.slice(0, 30)}..."`)
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
          continue
        }

        // Parse JSON from response
        let jsonText = text
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
        if (jsonMatch) {
          jsonText = jsonMatch[1].trim()
        }

        try {
          const parsed = JSON.parse(jsonText)
          const classification = parsed.classification || 'C'
          const isThisDuplicate = parsed.isDuplicate || classification === 'A'
          const semanticSimilarity = parsed.semanticSimilarity ?? (classification === 'A' ? 0.9 : classification === 'B' ? 0.5 : 0.1)
          const similarity = semanticSimilarity

          similarities.push({
            suggestion1Id: suggestion.id,
            suggestion2Id: existing.id,
            similarity,
            isDuplicate: isThisDuplicate,
            classification,
            categoryMatch: parsed.categoryMatch ?? false,
            keywordOverlap: parsed.keywordOverlap || [],
            suggestion1Keywords: parsed.suggestion1Keywords || suggestion.keywords || [],
            suggestion2Keywords: parsed.suggestion2Keywords || existing.keywords || [],
            semanticSimilarity,
            reason: parsed.reason || 'LLM classification'
          })

          if (similarity > highestSimilarity) {
            highestSimilarity = similarity
            mostSimilarId = existing.id
          }

          if (isThisDuplicate) {
            isDuplicate = true
          }
        } catch {
          // If parsing fails, skip this comparison
          console.error('Failed to parse LLM deduplication response')
        }
      }

      // Check against already-accepted unique suggestions from this batch
      for (const uniqueSuggestion of unique) {
        const sug1 = formatSuggestionForPrompt(suggestion)
        const sug2 = formatSuggestionForPrompt(uniqueSuggestion)

        const systemPrompt = DEDUPLICATION_PROMPTS.system
        const userPrompt = DEDUPLICATION_PROMPTS.user(sug1, sug2)
        const fullPrompt = `${systemPrompt}\n\n${userPrompt}`

        const request = {
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 256
          }
        }

        const url = `${GEMINI_API_URL}?key=${apiKey}`

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request)
        })

        if (!response.ok) {
          continue
        }

        const result = await response.json()
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text

        if (!text) {
          continue
        }

        let jsonText = text
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
        if (jsonMatch) {
          jsonText = jsonMatch[1].trim()
        }

        try {
          const parsed = JSON.parse(jsonText)
          const classification = parsed.classification || 'C'
          const isThisDuplicate = parsed.isDuplicate || classification === 'A'
          const semanticSimilarity = parsed.semanticSimilarity ?? (classification === 'A' ? 0.9 : classification === 'B' ? 0.5 : 0.1)
          const similarity = semanticSimilarity

          similarities.push({
            suggestion1Id: suggestion.id,
            suggestion2Id: uniqueSuggestion.id,
            similarity,
            isDuplicate: isThisDuplicate,
            classification,
            categoryMatch: parsed.categoryMatch ?? (suggestion.category === uniqueSuggestion.category),
            keywordOverlap: parsed.keywordOverlap || [],
            suggestion1Keywords: parsed.suggestion1Keywords || suggestion.keywords || [],
            suggestion2Keywords: parsed.suggestion2Keywords || uniqueSuggestion.keywords || [],
            semanticSimilarity,
            reason: parsed.reason || 'LLM classification'
          })

          if (similarity > highestSimilarity) {
            highestSimilarity = similarity
            mostSimilarId = uniqueSuggestion.id
          }

          if (isThisDuplicate) {
            isDuplicate = true
          }
        } catch {
          // Skip
        }
      }

      if (isDuplicate) {
        duplicates.push({
          suggestion,
          duplicateOf: mostSimilarId,
          similarityScore: highestSimilarity
        })
      } else {
        unique.push(suggestion)
      }
    }

    return { unique, duplicates, similarities }
  }

  async getAllDeduplicationResults(): Promise<Array<DeduplicationResult & { similarities: SimilarityPair[] }>> {
    const results: Array<DeduplicationResult & { similarities: SimilarityPair[] }> = []
    try {
      const files = await fs.promises.readdir(this.deduplicationDir)
      for (const file of files) {
        if (file.startsWith('dedup_') && file.endsWith('.json')) {
          const content = await fs.promises.readFile(path.join(this.deduplicationDir, file), 'utf-8')
          const parsed = JSON.parse(content)
          // Convert clusteredInto back to Map
          parsed.clusteredInto = new Map(Object.entries(parsed.clusteredInto))
          results.push(parsed)
        }
      }
    } catch (error) {
      console.error('Failed to get deduplication results:', error)
    }
    return results.sort((a, b) => b.processedAt - a.processedAt)
  }

  getDeduplicationDir(): string {
    return this.deduplicationDir
  }
}

export const deduplicationService = new DeduplicationService()
