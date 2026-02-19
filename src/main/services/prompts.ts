/**
 * LLM Prompts for the 5-step suggestion pipeline
 *
 * These prompts are used when swapping hardcoded logic with LLM calls.
 * Each step has a system prompt and a user prompt template.
 */

import type { FrameAnalysis } from './frameAnalysisService'

// ============================================================
// STEP 2.5: CONCENTRATION GATE PROMPTS
// ============================================================
export const CONCENTRATION_GATE_PROMPTS = {
  system: `You evaluate whether a user's current screen activity warrants generating productivity suggestions. Consider:
- Is this meaningfully different from recent activity?
- Is this important work (crisis, deadline, learning, coding, writing) or low-value (social media, idle, entertainment)?
- Even if similar to recent frames, high-importance work may still warrant processing.

IMPORTANT: Be conservative about skipping. When in doubt, choose CONTINUE.

Respond in JSON format:
{
  "decision": "CONTINUE" | "SKIP",
  "importance": 0.0-1.0,
  "reason": "Brief explanation"
}

Importance scale:
- 0.0-0.3: Low value (social media browsing, entertainment, idle)
- 0.4-0.6: Medium value (general browsing, casual reading)
- 0.7-1.0: High value (active work, coding, writing, meetings, urgent tasks)`,

  user: (currentFrame: FrameAnalysis, recentFrames: FrameAnalysis[]): string => {
    const formatFrame = (frame: FrameAnalysis): string => {
      return `{
  description: "${frame.analysis.description}",
  activities: [${frame.analysis.activities.map(a => `"${a}"`).join(', ')}],
  applications: [${frame.analysis.applications.map(a => `"${a}"`).join(', ')}],
  keywords: [${frame.analysis.keywords.map(k => `"${k}"`).join(', ')}]
}`
    }

    const recentFramesStr = recentFrames.length > 0
      ? recentFrames.map((f, i) => `[${i + 1}] ${formatFrame(f)}`).join('\n\n')
      : 'No recent frames available.'

    return `Current frame:
${formatFrame(currentFrame)}

Recent frames (for context):
${recentFramesStr}

Should we generate suggestions for this activity?`
  }
}

// ============================================================
// STEP 2: FRAME ANALYSIS PROMPTS
// ============================================================
export const FRAME_ANALYSIS_PROMPTS = {
  system: `Transcribe in markdown ALL the content from the screenshot of the user's screen.

NEVER SUMMARIZE ANYTHING. You must transcribe everything EXACTLY, word for word. Don't repeat yourself.

Include:
- ALL text visible on screen (every word, every label, every piece of content)
- All application names and window titles
- All file paths and folder names visible
- All website URLs and browser tab titles
- All code snippets, terminal output, chat messages
- All notifications, alerts, popups, and their content
- All button labels, menu items, sidebar content
- All names, dates, numbers, email addresses visible

Respond in JSON format:
{
  "transcription": "Complete word-for-word markdown transcription of everything on screen",
  "applications": ["app1", "app2", ...],
  "urls": ["any visible URLs"],
  "filePaths": ["any visible file paths"],
  "activities": ["what the user appears to be doing"],
  "keywords": ["important", "terms", "names", "projects", ...]
}

The transcription must be complete enough that someone could reconstruct exactly what was on screen.`,

  user: (imagePath: string) => `Transcribe this screenshot. Include every piece of text visible, word for word. Do not summarize.

Provide the complete transcription in JSON format.`
}

// ============================================================
// STEP 3: SUGGESTION GENERATION PROMPTS
// ============================================================
export const SUGGESTION_GENERATION_PROMPTS = {
  system: `You are a helpful AI assistant. Based on a transcription of what the user is seeing on their screen, generate concrete suggestions that would help them.

Generate 1-2 actionable suggestions. Each suggestion should have:
- title: A highly specific title mentioning exactly where and how you could help
- description: Why this suggestion would be helpful
- approach: Brief, high-level steps from now to completion. Be extremely specific and ensure each step is actionable by the user or an AI assistant. Don't reference external tools or programs.
- keywords: Keywords helpful for retrieval (include project names when possible)
- supportEvidence: What from the transcription supports this suggestion? Note anything missing.
- rawSupport: 1-10 score for how much information you have to actually complete this task
  - 1 = You don't have the information needed
  - 10 = You have everything needed to comprehensively complete it
- initialChatMessage: A detailed, helpful opening message (3-6 paragraphs) shown when the user starts a chat about this suggestion. This should:
  1. Explain specifically what you observed on their screen that led to this suggestion
  2. Describe the suggestion in detail - what it involves and why it would help
  3. Outline the concrete steps or approach you'd recommend
  4. Mention any relevant context, best practices, or considerations
  5. End by asking what aspect they'd like to start with or if they have questions
  Be conversational, specific, and thorough. Use markdown formatting (headers, bullet points, code blocks if relevant).

PRINCIPLES - You must follow these:
- Provide actionable and SPECIFIC recommendations
- Assign high support scores (8-10) only when fully justified by the transcription
- Ensure suggestions are distinct and not similar to each other
- Think beyond what is on screen - explore additional possibilities and approaches
- Incorporate external ideas, best practices, or creative solutions when reasonable

AVOID - Do not generate suggestions that:
- Are menial or purely organizational
- Are trivial or self-evident (e.g., clicking a clearly labeled button)
- Tell the user to do something they are ALREADY doing or in the process of doing
- The user or an AI assistant could not reasonably complete
- Are too high-level or generic
- You yourself don't have a clear idea of what the path to success looks like

Respond in JSON format:
{
  "suggestions": [
    {
      "title": "...",
      "description": "...",
      "approach": "...",
      "keywords": ["..."],
      "supportEvidence": "...",
      "rawSupport": 7,
      "initialChatMessage": "..."
    }
  ]
}`,

  user: (frameAnalyses: string, userPropositions: string) => `Based on the user's screen activity, generate helpful suggestions.

Screen Transcription:
${frameAnalyses}

User Context/Preferences:
${userPropositions || "No user preferences available."}

Generate specific, actionable suggestions in JSON format.`
}

// ============================================================
// STEP 4: SCORING & FILTERING PROMPTS
// ============================================================
export const SCORING_FILTERING_PROMPTS = {
  system: `You evaluate suggestions for a user based on their current screen activity.

For each suggestion, provide scores from 1-10:

1. **benefit**: "How beneficial will assistance on this suggestion be?"
   Consider:
   - How inherently simple or trivial is this? Self-evident actions score lower.
   - How generic is the suggestion? Generic suggestions score lower.
   - Is the user already doing this? If so, additional value may be low.
   - The scale of improvement the assistance can provide.
   Take a CONSERVATIVE approach - don't over-score benefit.

2. **disruptionCost**: "How disruptive would unsolicited assistance be?" (false positive cost)
   Consider:
   - How might this interfere with the user's current workflow or focus?
   - Is this suggestion useful for what the user is actively focused on?
   1 = not disruptive, 10 = highly disruptive

3. **missCost**: "How critical is it for the user to receive this if they need it?" (false negative cost)
   Consider:
   - Severity of potential challenges without this suggestion
   - How likely the task is to fail without intervention
   1 = no impact, 10 = significant negative impact

4. **decay**: "How much does the benefit diminish over time?"
   Consider:
   - Immediacy of the task's needs or deadlines
   - Whether the task becomes irrelevant if not addressed promptly
   1 = obsolete unless acted on immediately, 10 = still useful hours later

Respond in JSON format:
{
  "scores": {
    "benefit": 7,
    "disruptionCost": 3,
    "missCost": 6,
    "decay": 8
  },
  "filterDecision": {
    "passed": true,
    "reason": "High benefit with low disruption cost"
  }
}

A suggestion passes if: benefit >= 5 AND disruptionCost <= 6`,

  user: (suggestion: string, userContext: string) => `Evaluate this suggestion based on the user's current activity.

Suggestion:
${suggestion}

Current Screen Activity:
${userContext || "No additional context available."}

Provide your evaluation in JSON format.`
}

// ============================================================
// STEP 5: DEDUPLICATION PROMPTS
// ============================================================
export const DEDUPLICATION_PROMPTS = {
  system: `Determine the relationship between two suggestions.

Classify their relationship into one of these categories:

(A) COMBINE - The suggestions are similar and could be combined into one.
(B) RELATED - The suggestions are different but might be related through a broad goal.
(C) DIFFERENT - The suggestions are fundamentally different, addressing separate objectives.

Ignore irrelevant context when making a final classification.

Respond in JSON format:
{
  "classification": "A" | "B" | "C",
  "isDuplicate": true if classification is "A", false otherwise,
  "reason": "Brief explanation"
}`,

  user: (suggestion1: string, suggestion2: string) => `Compare these two suggestions.

Suggestion A:
${suggestion1}

Suggestion B:
${suggestion2}

Classify their relationship (A=combine, B=related, C=different).`
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
    keywords?: string[]
  }
  timestamp: number
}>): string {
  return analyses.map((a, i) => {
    const transcription = a.analysis?.description || 'No transcription'
    const activities = a.analysis?.activities || []
    const applications = a.analysis?.applications || []
    const keywords = a.analysis?.keywords || []
    return `--- Frame ${i + 1} ---
${transcription}

Applications: ${applications.join(', ') || 'None detected'}
Activities: ${activities.join(', ') || 'None detected'}
Keywords: ${keywords.slice(0, 20).join(', ') || 'None'}`
  }).join('\n\n')
}
