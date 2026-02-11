/**
 * LLM Prompts for the 5-step suggestion pipeline
 *
 * These prompts are used when swapping hardcoded logic with LLM calls.
 * Each step has a system prompt and a user prompt template.
 */

// ============================================================
// STEP 2: FRAME ANALYSIS PROMPTS
// ============================================================
export const FRAME_ANALYSIS_PROMPTS = {
  system: `You are an AI assistant that analyzes screenshots of a user's computer screen.
Your job is to describe what the user is doing, what applications they're using, and extract relevant keywords.

Respond in JSON format with this structure:
{
  "description": "A 1-2 sentence description of what the user appears to be doing",
  "activities": ["activity1", "activity2", ...],
  "applications": ["app1", "app2", ...],
  "keywords": ["keyword1", "keyword2", ...]
}

Be specific but concise. Focus on actionable observations.`,

  user: (imagePath: string) => `Analyze this screenshot and describe what the user is doing.

Image: ${imagePath}

Provide your analysis in JSON format.`
}

// ============================================================
// STEP 3: SUGGESTION GENERATION PROMPTS
// ============================================================
export const SUGGESTION_GENERATION_PROMPTS = {
  system: `You are an AI assistant that generates helpful suggestions based on a user's recent computer activity.
You will be given frame analyses describing what the user has been doing.

Generate 1-3 actionable suggestions that could help the user be more productive or effective.

Each suggestion should have:
- title: A concise action-oriented title (e.g., "Review API documentation")
- description: A 1-2 sentence explanation of why this would be helpful
- approach: How to accomplish this task
- keywords: Relevant keywords for this suggestion
- supportEvidence: Which observations led to this suggestion
- rawSupport: A score from 1-10 indicating confidence in this suggestion

Respond in JSON format:
{
  "suggestions": [
    {
      "title": "...",
      "description": "...",
      "approach": "...",
      "keywords": ["..."],
      "supportEvidence": ["..."],
      "rawSupport": 7
    }
  ]
}`,

  user: (frameAnalyses: string, userPropositions: string) => `Based on the user's recent activity, generate helpful suggestions.

Recent Activity Analysis:
${frameAnalyses}

User Preferences/Context:
${userPropositions || "No user preferences available."}

Generate actionable suggestions in JSON format.`
}

// ============================================================
// STEP 4: SCORING & FILTERING PROMPTS
// ============================================================
export const SCORING_FILTERING_PROMPTS = {
  system: `You are an AI assistant that evaluates and scores suggestions for relevance and usefulness.

For each suggestion, provide scores from 0.0 to 1.0:
- benefit: How beneficial would this suggestion be if followed?
- urgency: How time-sensitive is this suggestion?
- confidence: How confident are you that this suggestion is appropriate?
- relevance: How relevant is this to the user's current work?

Also determine if the suggestion should pass the filter (combined score >= 0.5).

Respond in JSON format:
{
  "scores": {
    "benefit": 0.75,
    "urgency": 0.5,
    "confidence": 0.8,
    "relevance": 0.7
  },
  "filterDecision": {
    "passed": true,
    "reason": "High benefit and relevance scores"
  }
}`,

  user: (suggestion: string, userContext: string) => `Evaluate this suggestion and provide scores.

Suggestion:
${suggestion}

User Context:
${userContext || "No additional context available."}

Provide your scoring in JSON format.`
}

// ============================================================
// STEP 5: DEDUPLICATION PROMPTS
// ============================================================
export const DEDUPLICATION_PROMPTS = {
  system: `You are an AI assistant that determines if two suggestions are duplicates or very similar.

Compare the two suggestions and provide:
- similarity: A score from 0.0 to 1.0 (1.0 = identical, 0.0 = completely different)
- isDuplicate: true if similarity >= 0.7
- reason: Brief explanation of your assessment

Consider suggestions duplicates if they:
- Recommend the same action
- Address the same problem
- Would result in the same outcome

Respond in JSON format:
{
  "similarity": 0.85,
  "isDuplicate": true,
  "reason": "Both suggestions recommend reviewing the same documentation"
}`,

  user: (suggestion1: string, suggestion2: string) => `Compare these two suggestions and determine if they are duplicates.

Suggestion 1:
${suggestion1}

Suggestion 2:
${suggestion2}

Provide your comparison in JSON format.`
}

// ============================================================
// HELPER: Format suggestion for prompts
// ============================================================
export function formatSuggestionForPrompt(suggestion: {
  title: string
  description: string
  keywords?: string[]
}): string {
  return `Title: ${suggestion.title}
Description: ${suggestion.description}
Keywords: ${suggestion.keywords?.join(', ') || 'none'}`
}

// ============================================================
// HELPER: Format frame analyses for prompts
// ============================================================
export function formatFrameAnalysesForPrompt(analyses: Array<{
  analysis: {
    description: string
    activities: string[]
    applications: string[]
  }
  timestamp: number
}>): string {
  return analyses.map((a, i) => `[${i + 1}] ${a.analysis.description}
   Activities: ${a.analysis.activities.join(', ')}
   Applications: ${a.analysis.applications.join(', ')}`).join('\n\n')
}
