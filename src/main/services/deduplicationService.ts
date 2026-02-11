import * as fs from 'fs'
import * as path from 'path'
import { dataStore } from './dataStore'
import { ScoredSuggestion } from './scoringFilteringService'
import { DEDUPLICATION_PROMPTS, formatSuggestionForPrompt } from './prompts'

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
  reason: string
}

class DeduplicationService {
  private deduplicationDir: string = ''
  private readonly SIMILARITY_THRESHOLD = 0.7 // Consider duplicates above this

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

    // ============================================================
    // HARDCODED DEDUPLICATION - SWAP THIS WITH LLM CALL
    // ============================================================
    // PROMPTS THAT WOULD BE SENT TO LLM (for each pair):
    if (suggestions.length > 0 && existingSuggestions.length > 0) {
      const sug1 = formatSuggestionForPrompt(suggestions[0])
      const sug2 = formatSuggestionForPrompt({
        title: existingSuggestions[0].title,
        description: existingSuggestions[0].description,
        keywords: existingSuggestions[0].keywords
      })
      console.log('\n--- DEDUPLICATION PROMPT (sample) ---')
      console.log('SYSTEM:', DEDUPLICATION_PROMPTS.system.slice(0, 300) + '...')
      console.log('USER:', DEDUPLICATION_PROMPTS.user(sug1, sug2))
      console.log('--- END PROMPT ---\n')
    } else if (suggestions.length > 1) {
      const sug1 = formatSuggestionForPrompt(suggestions[0])
      const sug2 = formatSuggestionForPrompt(suggestions[1])
      console.log('\n--- DEDUPLICATION PROMPT (sample) ---')
      console.log('SYSTEM:', DEDUPLICATION_PROMPTS.system.slice(0, 300) + '...')
      console.log('USER:', DEDUPLICATION_PROMPTS.user(sug1, sug2))
      console.log('--- END PROMPT ---\n')
    }
    //
    // To swap with LLM:
    // For each pair (newSuggestion, existingSuggestion):
    //   const response = await llm.call({
    //     system: DEDUPLICATION_PROMPTS.system,
    //     user: DEDUPLICATION_PROMPTS.user(formatSuggestionForPrompt(s1), formatSuggestionForPrompt(s2))
    //   })
    //   const { similarity, isDuplicate, reason } = JSON.parse(response)
    // ============================================================
    const { unique, duplicates, similarities } = this.deduplicateHardcoded(
      suggestions,
      existingSuggestions.map(s => ({
        id: s.suggestionId,
        title: s.title,
        keywords: s.keywords
      }))
    )
    // ============================================================

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

  private deduplicateHardcoded(
    newSuggestions: ScoredSuggestion[],
    existingSuggestions: Array<{ id: string; title: string; keywords: string[] }>
  ): {
    unique: ScoredSuggestion[]
    duplicates: Array<{ suggestion: ScoredSuggestion; duplicateOf: string; similarityScore: number }>
    similarities: SimilarityPair[]
  } {
    const unique: ScoredSuggestion[] = []
    const duplicates: Array<{ suggestion: ScoredSuggestion; duplicateOf: string; similarityScore: number }> = []
    const similarities: SimilarityPair[] = []

    for (const suggestion of newSuggestions) {
      let isDuplicate = false
      let highestSimilarity = 0
      let mostSimilarId = ''

      // Check against existing suggestions in dataStore
      for (const existing of existingSuggestions) {
        const similarity = this.calculateSimilarity(
          { title: suggestion.title, keywords: suggestion.keywords },
          { title: existing.title, keywords: existing.keywords }
        )

        similarities.push({
          suggestion1Id: suggestion.id,
          suggestion2Id: existing.id,
          similarity,
          reason: `Keyword overlap and title similarity`
        })

        if (similarity > highestSimilarity) {
          highestSimilarity = similarity
          mostSimilarId = existing.id
        }

        if (similarity >= this.SIMILARITY_THRESHOLD) {
          isDuplicate = true
        }
      }

      // Check against already-accepted unique suggestions from this batch
      for (const uniqueSuggestion of unique) {
        const similarity = this.calculateSimilarity(
          { title: suggestion.title, keywords: suggestion.keywords },
          { title: uniqueSuggestion.title, keywords: uniqueSuggestion.keywords }
        )

        similarities.push({
          suggestion1Id: suggestion.id,
          suggestion2Id: uniqueSuggestion.id,
          similarity,
          reason: `Keyword overlap and title similarity`
        })

        if (similarity > highestSimilarity) {
          highestSimilarity = similarity
          mostSimilarId = uniqueSuggestion.id
        }

        if (similarity >= this.SIMILARITY_THRESHOLD) {
          isDuplicate = true
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

  private calculateSimilarity(
    a: { title: string; keywords: string[] },
    b: { title: string; keywords: string[] }
  ): number {
    // Simple keyword overlap + title word overlap
    const aKeywords = new Set([...a.keywords, ...a.title.toLowerCase().split(/\s+/)])
    const bKeywords = new Set([...b.keywords, ...b.title.toLowerCase().split(/\s+/)])

    const intersection = new Set([...aKeywords].filter(x => bKeywords.has(x)))
    const union = new Set([...aKeywords, ...bKeywords])

    // Jaccard similarity
    return intersection.size / union.size
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
