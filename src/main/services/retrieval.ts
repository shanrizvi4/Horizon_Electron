/**
 * Retrieval utilities ported from gum-backend/src/utils.py
 * Implements BM25 search, TF-IDF similarity, and Maximal Marginal Relevance (MMR)
 */

// =============================================================================
// STOPWORDS (English)
// =============================================================================

const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he',
  'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'were',
  'will', 'with', 'the', 'this', 'but', 'they', 'have', 'had', 'what', 'when',
  'where', 'who', 'which', 'why', 'how', 'all', 'each', 'every', 'both', 'few',
  'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
  'same', 'so', 'than', 'too', 'very', 'just', 'can', 'should', 'now', 'i',
  'you', 'your', 'we', 'our', 'my', 'me', 'him', 'her', 'them', 'their', 'been',
  'being', 'do', 'does', 'did', 'doing', 'would', 'could', 'might', 'must',
  'shall', 'into', 'if', 'then', 'else', 'because', 'until', 'while', 'about',
  'against', 'between', 'through', 'during', 'before', 'after', 'above', 'below',
  'up', 'down', 'out', 'off', 'over', 'under', 'again', 'further', 'once', 'here',
  'there', 'any', 'also', 'am', 'or'
])

// =============================================================================
// PORTER STEMMER (simplified)
// =============================================================================

/**
 * Simplified Porter Stemmer for English
 * Based on the Porter Stemming Algorithm
 */
function stem(word: string): string {
  word = word.toLowerCase()

  // Step 1a
  if (word.endsWith('sses')) {
    word = word.slice(0, -2)
  } else if (word.endsWith('ies')) {
    word = word.slice(0, -2)
  } else if (word.endsWith('ss')) {
    // do nothing
  } else if (word.endsWith('s')) {
    word = word.slice(0, -1)
  }

  // Step 1b
  if (word.endsWith('eed')) {
    if (word.length > 4) word = word.slice(0, -1)
  } else if (word.endsWith('ed')) {
    if (/[aeiou]/.test(word.slice(0, -2))) {
      word = word.slice(0, -2)
      if (word.endsWith('at') || word.endsWith('bl') || word.endsWith('iz')) {
        word += 'e'
      }
    }
  } else if (word.endsWith('ing')) {
    if (/[aeiou]/.test(word.slice(0, -3))) {
      word = word.slice(0, -3)
      if (word.endsWith('at') || word.endsWith('bl') || word.endsWith('iz')) {
        word += 'e'
      }
    }
  }

  // Step 1c
  if (word.endsWith('y') && word.length > 2 && !/[aeiou]/.test(word[word.length - 2])) {
    word = word.slice(0, -1) + 'i'
  }

  // Step 2 (simplified - common suffixes)
  const step2Suffixes: [string, string][] = [
    ['ational', 'ate'], ['tional', 'tion'], ['enci', 'ence'], ['anci', 'ance'],
    ['izer', 'ize'], ['isation', 'ize'], ['ization', 'ize'], ['ation', 'ate'],
    ['ator', 'ate'], ['alism', 'al'], ['iveness', 'ive'], ['fulness', 'ful'],
    ['ousness', 'ous'], ['aliti', 'al'], ['iviti', 'ive'], ['biliti', 'ble']
  ]
  for (const [suffix, replacement] of step2Suffixes) {
    if (word.endsWith(suffix) && word.length > suffix.length + 2) {
      word = word.slice(0, -suffix.length) + replacement
      break
    }
  }

  // Step 3 (simplified)
  const step3Suffixes: [string, string][] = [
    ['icate', 'ic'], ['ative', ''], ['alize', 'al'], ['iciti', 'ic'],
    ['ical', 'ic'], ['ful', ''], ['ness', '']
  ]
  for (const [suffix, replacement] of step3Suffixes) {
    if (word.endsWith(suffix) && word.length > suffix.length + 2) {
      word = word.slice(0, -suffix.length) + replacement
      break
    }
  }

  return word
}

// =============================================================================
// TOKENIZATION
// =============================================================================

/**
 * Tokenize text: lowercase, remove punctuation, stem, remove stopwords
 */
export function tokenize(text: string): string[] {
  // Lowercase and split on non-alphanumeric
  const words = text.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 1)

  // Remove stopwords and stem
  return words
    .filter(w => !STOPWORDS.has(w))
    .map(w => stem(w))
    .filter(w => w.length > 1)
}

// =============================================================================
// BM25 SEARCH
// =============================================================================

interface BM25Index {
  docFreq: Map<string, number>      // term -> number of docs containing term
  docLengths: number[]              // length of each doc
  avgDocLength: number              // average doc length
  termFreqs: Map<string, number>[]  // for each doc, term -> frequency
  corpus: string[]                  // original documents
  tokenizedCorpus: string[][]       // tokenized documents
}

/**
 * Build BM25 index from corpus
 */
function buildBM25Index(corpus: string[]): BM25Index {
  const tokenizedCorpus = corpus.map(doc => tokenize(doc))
  const docFreq = new Map<string, number>()
  const termFreqs: Map<string, number>[] = []
  const docLengths: number[] = []

  for (const tokens of tokenizedCorpus) {
    const tf = new Map<string, number>()
    const seen = new Set<string>()

    for (const token of tokens) {
      tf.set(token, (tf.get(token) || 0) + 1)
      if (!seen.has(token)) {
        docFreq.set(token, (docFreq.get(token) || 0) + 1)
        seen.add(token)
      }
    }

    termFreqs.push(tf)
    docLengths.push(tokens.length)
  }

  const avgDocLength = docLengths.reduce((a, b) => a + b, 0) / (docLengths.length || 1)

  return {
    docFreq,
    docLengths,
    avgDocLength,
    termFreqs,
    corpus,
    tokenizedCorpus
  }
}

/**
 * Calculate BM25 score for a single document
 * @param k1 - Term frequency saturation parameter (default 1.5)
 * @param b - Length normalization parameter (default 0.75)
 */
function bm25Score(
  queryTokens: string[],
  docIndex: number,
  index: BM25Index,
  k1: number = 1.5,
  b: number = 0.75
): number {
  const N = index.corpus.length
  const docLength = index.docLengths[docIndex]
  const tf = index.termFreqs[docIndex]

  let score = 0

  for (const term of queryTokens) {
    const termFreq = tf.get(term) || 0
    if (termFreq === 0) continue

    const df = index.docFreq.get(term) || 0

    // IDF component: log((N - df + 0.5) / (df + 0.5) + 1)
    const idf = Math.log((N - df + 0.5) / (df + 0.5) + 1)

    // TF component with length normalization
    const tfNorm = (termFreq * (k1 + 1)) /
      (termFreq + k1 * (1 - b + b * docLength / index.avgDocLength))

    score += idf * tfNorm
  }

  return score
}

/**
 * BM25 search: returns documents ranked by relevance to query
 * @returns [sortedIndices, sortedScores] - Arrays of document indices and their scores
 */
export function bm25Search(corpus: string[], query: string): [number[], number[]] {
  if (corpus.length === 0) {
    return [[], []]
  }

  const index = buildBM25Index(corpus)
  const queryTokens = tokenize(query)

  if (queryTokens.length === 0) {
    // Return all docs with score 0 if query is empty
    return [corpus.map((_, i) => i), corpus.map(() => 0)]
  }

  // Calculate scores for all documents
  const scores: [number, number][] = corpus.map((_, i) => [i, bm25Score(queryTokens, i, index)])

  // Sort by score descending
  scores.sort((a, b) => b[1] - a[1])

  const sortedIndices = scores.map(s => s[0])
  const sortedScores = scores.map(s => s[1])

  return [sortedIndices, sortedScores]
}

// =============================================================================
// TF-IDF VECTORIZER
// =============================================================================

interface TfidfMatrix {
  vocabulary: Map<string, number>  // term -> index
  vectors: number[][]              // document vectors
}

/**
 * Build TF-IDF matrix from documents
 */
function buildTfidfMatrix(documents: string[]): TfidfMatrix {
  const tokenizedDocs = documents.map(doc => tokenize(doc))

  // Build vocabulary
  const vocabulary = new Map<string, number>()
  let vocabIndex = 0
  for (const tokens of tokenizedDocs) {
    for (const token of tokens) {
      if (!vocabulary.has(token)) {
        vocabulary.set(token, vocabIndex++)
      }
    }
  }

  if (vocabulary.size === 0) {
    return { vocabulary, vectors: documents.map(() => []) }
  }

  // Calculate document frequencies
  const docFreq = new Map<string, number>()
  for (const tokens of tokenizedDocs) {
    const seen = new Set<string>()
    for (const token of tokens) {
      if (!seen.has(token)) {
        docFreq.set(token, (docFreq.get(token) || 0) + 1)
        seen.add(token)
      }
    }
  }

  const N = documents.length

  // Build TF-IDF vectors
  const vectors: number[][] = []
  for (const tokens of tokenizedDocs) {
    const vector = new Array(vocabulary.size).fill(0)
    const termCounts = new Map<string, number>()

    for (const token of tokens) {
      termCounts.set(token, (termCounts.get(token) || 0) + 1)
    }

    for (const [term, count] of termCounts) {
      const idx = vocabulary.get(term)!
      const tf = count / (tokens.length || 1)
      const df = docFreq.get(term) || 1
      const idf = Math.log((N + 1) / (df + 1)) + 1  // Smoothed IDF
      vector[idx] = tf * idf
    }

    // L2 normalize
    const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0))
    if (norm > 0) {
      for (let i = 0; i < vector.length; i++) {
        vector[i] /= norm
      }
    }

    vectors.push(vector)
  }

  return { vocabulary, vectors }
}

/**
 * Cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0) return 0

  let dot = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
  }
  return dot  // Vectors are already L2 normalized
}

// =============================================================================
// MAXIMAL MARGINAL RELEVANCE (MMR)
// =============================================================================

export interface MMROptions {
  lambdaParam?: number    // Balance between relevance and diversity (0-1, default 0.5)
  alpha?: number          // Recency decay rate (default 0.1)
  topN?: number           // Number of documents to select (default 10)
}

/**
 * Re-rank documents using Maximal Marginal Relevance with optional recency decay
 *
 * @param documents - List of document texts
 * @param scores - Relevance scores for each document (from BM25)
 * @param timestamps - Optional list of timestamps (unix timestamps or "timestamp-timestamp.json" format)
 * @param options - MMR options
 * @returns [selectedDocs, selectedScores]
 */
export function maximalMarginalRelevance(
  documents: string[],
  scores: number[],
  timestamps?: (number | string)[],
  options: MMROptions = {}
): [string[], number[]] {
  const { lambdaParam = 0.5, alpha = 0.1, topN = 10 } = options

  if (lambdaParam < 0 || lambdaParam > 1) {
    throw new Error('lambdaParam must be between 0 and 1')
  }

  const nDocs = documents.length
  if (nDocs === 0) {
    return [[], []]
  }

  if (timestamps && timestamps.length !== nDocs) {
    throw new Error('Length of timestamps must equal number of documents')
  }

  const actualTopN = Math.min(topN, nDocs)
  const now = Date.now()

  // Build TF-IDF matrix for diversity calculation
  const tfidfMatrix = buildTfidfMatrix(documents)

  const selectedIndices: number[] = []
  const selectedDocs: string[] = []
  const selectedScores: number[] = []
  const candidateIndices = new Set(Array.from({ length: nDocs }, (_, i) => i))

  while (selectedIndices.length < actualTopN && candidateIndices.size > 0) {
    let bestIdx = -1
    let bestMMRScore = -Infinity

    for (const idx of candidateIndices) {
      let relevance = scores[idx]

      // Apply recency decay if timestamps provided
      if (timestamps) {
        const ts = timestamps[idx]
        let docTime: number

        if (typeof ts === 'number') {
          docTime = ts
        } else if (typeof ts === 'string') {
          // Parse "timestamp-timestamp.json" format
          const parts = ts.replace('.json', '').split('-')
          docTime = parseFloat(parts[0]) * 1000  // Convert to ms if in seconds
        } else {
          docTime = now
        }

        const ageInDays = (now - docTime) / (1000 * 60 * 60 * 24)
        const recencyDecay = Math.exp(-alpha * ageInDays)
        relevance *= recencyDecay
      }

      // Calculate diversity (max similarity to already selected docs)
      let diversity = 0
      if (selectedIndices.length > 0 && tfidfMatrix.vectors[idx].length > 0) {
        for (const selIdx of selectedIndices) {
          const sim = cosineSimilarity(tfidfMatrix.vectors[idx], tfidfMatrix.vectors[selIdx])
          if (sim > diversity) {
            diversity = sim
          }
        }
      }

      // MMR score: λ * relevance - (1 - λ) * diversity
      const mmrScore = lambdaParam * relevance - (1 - lambdaParam) * diversity

      if (mmrScore > bestMMRScore) {
        bestMMRScore = mmrScore
        bestIdx = idx
      }
    }

    if (bestIdx === -1) break

    selectedIndices.push(bestIdx)
    selectedDocs.push(documents[bestIdx])
    selectedScores.push(scores[bestIdx])
    candidateIndices.delete(bestIdx)
  }

  return [selectedDocs, selectedScores]
}

// =============================================================================
// COMBINED RETRIEVE AND RERANK
// =============================================================================

export interface RetrieveOptions {
  lambdaParam?: number    // 0-1, if 1 skip MMR reranking (default 0.2)
  topN?: number           // Number of docs to return (default 5)
  timestamps?: (number | string)[]  // Optional timestamps for recency
  alpha?: number          // Recency decay rate (default 0.1)
}

/**
 * Retrieve documents using BM25, then optionally rerank with MMR
 *
 * @param corpus - List of document texts
 * @param query - Search query
 * @param options - Retrieval options
 * @returns [selectedDocs, selectedScores]
 */
export function retrieveAndRerank(
  corpus: string[],
  query: string,
  options: RetrieveOptions = {}
): [string[], number[]] {
  const { lambdaParam = 0.2, topN = 5, timestamps, alpha = 0.1 } = options

  if (corpus.length === 0) {
    return [[], []]
  }

  // BM25 search
  const [sortedIndices, sortedScores] = bm25Search(corpus, query)

  // Reorder documents and scores by BM25 ranking
  const documents = sortedIndices.map(i => corpus[i])
  const scores = sortedScores

  // Reorder timestamps if provided
  let reorderedTimestamps: (number | string)[] | undefined
  if (timestamps) {
    reorderedTimestamps = sortedIndices.map(i => timestamps[i])
  }

  // If lambdaParam is 1, skip MMR and return BM25 results
  if (lambdaParam === 1) {
    return [documents.slice(0, topN), scores.slice(0, topN)]
  }

  // Apply MMR reranking
  return maximalMarginalRelevance(documents, scores, reorderedTimestamps, {
    lambdaParam,
    alpha,
    topN
  })
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Generate a Likert scale mapping from 1 to scaleCount to probabilities between 0 and 1
 */
export function likert(scaleCount: number): Record<number, number> {
  if (scaleCount < 2) {
    throw new Error('scaleCount must be at least 2')
  }

  const result: Record<number, number> = {}
  for (let i = 1; i <= scaleCount; i++) {
    result[i] = (i - 1) / (scaleCount - 1)
  }
  return result
}

// Pre-computed Likert 10 scale
export const LIKERT_10 = likert(10)

/**
 * Convert a string or array to string for ingestion
 */
export function strify(v: string | string[]): string {
  return Array.isArray(v) ? v.join(', ') : v
}

/**
 * Flatten a suggestion object into a string for retrieval
 */
export function stringifySuggestion(suggestion: {
  title: string
  description: string
  keywords?: string[] | string
  approach?: string
}): string {
  const parts: string[] = []
  parts.push(`title: ${suggestion.title}`)
  parts.push(`description: ${suggestion.description}`)
  if (suggestion.keywords) {
    parts.push(`keywords: ${strify(suggestion.keywords)}`)
  }
  if (suggestion.approach) {
    parts.push(`approach: ${suggestion.approach}`)
  }
  return parts.join('\n')
}

/**
 * Create a random hex ID
 */
export function createRandomId(length: number = 16): string {
  const chars = '0123456789abcdef'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result
}

/**
 * Extract timestamp from filename like "frame_1234567890.123.jpg"
 */
export function extractTimestamp(filename: string): number | null {
  const match = filename.match(/frame_(\d+\.?\d*)\.jpg/)
  return match ? parseFloat(match[1]) : null
}

/**
 * Extract timestamp span from filename like "1234567890.123-1234567891.456.json"
 */
export function extractTimestampSpan(filename: string): [number, number] | null {
  const core = filename.replace('.json', '')
  const parts = core.split('-')
  if (parts.length !== 2) return null
  return [parseFloat(parts[0]), parseFloat(parts[1])]
}

// =============================================================================
// EXPORTS FOR TESTING
// =============================================================================

export const _internal = {
  stem,
  buildBM25Index,
  bm25Score,
  buildTfidfMatrix,
  cosineSimilarity
}
