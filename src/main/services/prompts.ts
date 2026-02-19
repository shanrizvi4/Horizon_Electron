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

## QUALITY REQUIREMENTS
A suggestion MUST be:
- **Accurate**: The problem/opportunity actually exists
- **Relevant**: It matters to the user's current context
- **Timely**: This is the appropriate moment to suggest it
- **Actionable**: The user knows exactly what to do
- **Clear**: No ambiguity in what's being suggested

**CRITICAL: Generate NOTHING rather than bad suggestions. If you cannot meet ALL quality requirements, return an empty suggestions array.**

## CATEGORIES
Each suggestion must belong to exactly one category:

1. **problem**: Something is wrong or might go wrong
   - Visible errors, failures, potential issues, risky patterns
   - Higher urgency - user should address soon

2. **efficiency**: There's a better or faster way
   - Suboptimal workflows, automatable work, shortcuts available
   - Medium urgency - would improve productivity

3. **learning**: User might not know about this
   - Unknown features, helpful concepts, better tools for the task
   - Lower urgency - educational value

## OUTPUT STRUCTURE
Each suggestion must include:
- **title**: Highly specific title mentioning exactly where and how you could help
- **category**: One of "problem", "efficiency", or "learning"
- **description**: Why this suggestion would be helpful
- **approach**: Brief, high-level steps from now to completion
- **keywords**: Keywords helpful for retrieval (include project names)
- **confidence**: 0-1 score for how confident you are this suggestion is correct and valuable
  - 0.9-1.0 = Certain this is accurate and helpful
  - 0.7-0.9 = Highly confident
  - 0.5-0.7 = Moderately confident
  - Below 0.5 = Do not generate this suggestion
- **decayProfile**: How quickly the suggestion's value diminishes
  - "ephemeral": 2-minute half-life - only valuable right now
  - "session": 2-hour half-life - valuable during this work session
  - "durable": 1-week half-life - valuable for extended periods
  - "evergreen": No decay - valuable until explicitly addressed
- **supportEvidence**: What from the transcription supports this suggestion
- **initialChatMessage**: A detailed opening message (3-6 paragraphs) for when user starts a chat. Include:
  1. What you observed that led to this suggestion
  2. Detailed description and why it would help
  3. Concrete steps you'd recommend
  4. Relevant context, best practices, considerations
  5. Ask what aspect they'd like to start with

## PRINCIPLES
- Provide actionable and SPECIFIC recommendations
- Be CONSERVATIVE with confidence scores
- Ensure suggestions are distinct from each other
- Think beyond what's on screen when reasonable

## AVOID
Do not generate suggestions that:
- Are trivial or self-evident
- Tell the user to do something they're ALREADY doing
- Cannot be reasonably completed by user or AI assistant
- Are too high-level or generic
- You yourself don't have a clear path to success for

Respond in JSON format:
{
  "suggestions": [
    {
      "title": "...",
      "category": "problem" | "efficiency" | "learning",
      "description": "...",
      "approach": "...",
      "keywords": ["..."],
      "confidence": 0.85,
      "decayProfile": "session",
      "supportEvidence": "...",
      "initialChatMessage": "..."
    }
  ]
}`,

  user: (frameAnalyses: string, userPropositions: string) => `Based on the user's screen activity, generate helpful suggestions.

Screen Transcription:
${frameAnalyses}

User Context/Preferences:
${userPropositions || "No user preferences available."}

Generate specific, actionable suggestions in JSON format. Remember: generate NOTHING rather than low-quality suggestions.`
}

// ============================================================
// STEP 4: SCORING & FILTERING PROMPTS
// ============================================================
export const SCORING_FILTERING_PROMPTS = {
  system: `You evaluate suggestions for a user based on their current screen activity.

For each suggestion, provide scores from 0-10 on these dimensions:

1. **importance**: "How much value would this provide if valid?"
   Consider:
   - Impact on user's work quality or productivity
   - Severity of the problem being addressed (for problem category)
   - Magnitude of efficiency gain (for efficiency category)
   - Learning value and applicability (for learning category)
   0-3 = Low value, 4-6 = Medium value, 7-10 = High value

2. **confidence**: "How likely is this suggestion correct and applicable?"
   Consider:
   - Is there clear evidence from the screen supporting this?
   - Could this be a misinterpretation of the user's intent?
   - How specific vs generic is the suggestion?
   - Does the approach actually solve the identified issue?
   0-3 = Uncertain/speculative, 4-6 = Moderately confident, 7-10 = Highly confident
   **This dimension has the HIGHEST WEIGHT - be conservative.**

3. **timeliness**: "Is now the right moment for this suggestion?"
   Consider:
   - Is the user in a stuck state (struggling, errors, repeated attempts)?
   - Is the user in flow state (making steady progress, focused)?
   - Would interruption now be helpful or disruptive?
   - Is this time-sensitive (will become irrelevant soon)?
   0-3 = Bad timing (user in flow, would disrupt), 4-6 = Neutral timing, 7-10 = Perfect timing (user stuck, needs help)

4. **actionability**: "Can the user act on this immediately?"
   Consider:
   - Are all prerequisites met?
   - Is the suggested action clear and specific?
   - Does the user have the tools/access needed?
   - Is this something that can be done now vs later?
   0-3 = Cannot act now, 4-6 = Some preparation needed, 7-10 = Can act immediately

## FILTERING RULES
**ALL dimensions must score >= 5 to pass.** If ANY dimension is below 5, the suggestion is KILLED.

Composite score = 0.3*importance + 0.4*confidence + 0.2*timeliness + 0.1*actionability

A suggestion enters the candidate pool if:
- All dimensions >= 5 AND
- Composite score >= 6.0

Respond in JSON format:
{
  "scores": {
    "importance": 7,
    "confidence": 8,
    "timeliness": 6,
    "actionability": 9
  },
  "compositeScore": 7.3,
  "filterDecision": {
    "passed": true,
    "reason": "All dimensions above threshold, high confidence and actionability"
  }
}`,

  user: (suggestion: string, userContext: string) => `Evaluate this suggestion based on the user's current activity.

Suggestion:
${suggestion}

Current Screen Activity:
${userContext || "No additional context available."}

Score each dimension (0-10), calculate the composite score, and determine if it passes the filter.
Remember: ALL dimensions must be >= 5, and composite must be >= 6.0 to pass.`
}

// ============================================================
// STEP 5: DEDUPLICATION PROMPTS
// ============================================================
export const DEDUPLICATION_PROMPTS = {
  system: `Determine the relationship between two suggestions by analyzing their category, keywords, and semantic meaning.

## Analysis Steps

1. **Category Comparison**: Are they the same category (problem/efficiency/learning)?
   - Same category suggestions are MORE likely to be duplicates
   - Different category suggestions addressing the same issue should be kept separate

2. **Keyword Overlap**: Extract and compare key terms from both suggestions
   - High overlap (>50% shared keywords) suggests potential duplicate
   - Low overlap suggests distinct suggestions

3. **Semantic Similarity**: Do they address the same underlying issue/opportunity?
   - Same root problem/opportunity = likely duplicate
   - Related but distinct aspects = keep both

## Classification

(A) **DUPLICATE** - Suggestions address the SAME issue in the SAME way
   - Same category, high keyword overlap, same semantic intent
   - Action: Merge into one, keeping the higher-scored version

(B) **RELATED** - Suggestions touch the same area but address DIFFERENT aspects
   - May share some keywords but have distinct approaches
   - Example: One suggests fixing a bug, another suggests adding tests for that code
   - Action: Keep both, they provide complementary value

(C) **DIFFERENT** - Suggestions are fundamentally unrelated
   - Different categories or completely different domains
   - Action: Keep both, no relationship to track

Respond in JSON format:
{
  "classification": "A" | "B" | "C",
  "isDuplicate": true,
  "categoryMatch": true,
  "keywordOverlap": ["shared", "keywords"],
  "suggestion1Keywords": ["key1", "key2"],
  "suggestion2Keywords": ["key2", "key3"],
  "semanticSimilarity": 0.85,
  "reason": "Both suggestions address the same authentication bug with identical approaches"
}`,

  user: (suggestion1: string, suggestion2: string) => `Compare these two suggestions for potential duplication.

Suggestion A:
${suggestion1}

Suggestion B:
${suggestion2}

Analyze category match, keyword overlap, and semantic similarity.
Classify as: (A) DUPLICATE, (B) RELATED, or (C) DIFFERENT.`
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
