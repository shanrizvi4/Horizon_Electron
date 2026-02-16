/**
 * =============================================================================
 * FAKE SUGGESTION SERVICE
 * =============================================================================
 *
 * Development service that generates fake suggestions every 10 seconds.
 * Used for testing the UI without the real LLM pipeline.
 *
 * @module services/fakeSuggestionService
 */

import { dataStore } from './dataStore'
import type { Suggestion } from '../types'

// =============================================================================
// FAKE SUGGESTIONS DATA
// =============================================================================

const FAKE_SUGGESTIONS = [
  {
    title: 'Review pull request #142',
    description: 'There\'s an open pull request that needs your review. It includes changes to the authentication flow.',
    approach: 'Open GitHub, navigate to the PR, review the changes and leave feedback.',
    keywords: ['github', 'pull request', 'code review'],
    initialResponse: 'I noticed PR #142 has been open for a while and includes changes to the authentication flow. Here\'s what I can help you with:\n\n1. **Quick summary** - The PR modifies the login and session handling logic\n2. **Key files changed** - `auth.ts`, `session.ts`, and related tests\n3. **Potential concerns** - Make sure to check the token refresh logic\n\nWould you like me to help you draft review comments or highlight specific areas to focus on?',
  },
  {
    title: 'Respond to Slack message',
    description: 'You have an unread message from the team channel about the upcoming sprint planning.',
    approach: 'Open Slack, read the message, and respond with your availability.',
    keywords: ['slack', 'communication', 'team'],
    initialResponse: 'I saw there\'s an unread message in your team channel about sprint planning. Based on your calendar, you appear to be free:\n\n- **Tuesday 2-4pm**\n- **Wednesday 10am-12pm**\n- **Thursday 3-5pm**\n\nWould you like me to help draft a response with your availability, or should I check for any conflicts first?',
  },
  {
    title: 'Update project documentation',
    description: 'The README file is outdated and doesn\'t reflect the recent API changes.',
    approach: 'Open the README.md file and update the API endpoints section.',
    keywords: ['documentation', 'readme', 'api'],
    initialResponse: 'The README hasn\'t been updated since the recent API changes. Here\'s what needs to be documented:\n\n1. **New endpoints** - `/api/v2/users` and `/api/v2/auth`\n2. **Changed parameters** - The `limit` param now defaults to 50\n3. **Deprecated** - `/api/v1/legacy` endpoints\n\nI can help you draft the updated documentation. Should I generate a diff of what needs to change?',
  },
  {
    title: 'Fix failing test',
    description: 'The CI pipeline is showing a failing test in the user authentication module.',
    approach: 'Run the tests locally, identify the issue, and push a fix.',
    keywords: ['testing', 'ci', 'bug fix'],
    initialResponse: 'The CI is failing on `auth.test.ts` - specifically the "should refresh expired tokens" test case. Looking at the error:\n\n```\nExpected: 200\nReceived: 401\n```\n\nThis suggests the mock token expiry time may need adjustment after the recent auth changes. Would you like me to help debug this or suggest a fix?',
  },
  {
    title: 'Schedule team sync',
    description: 'It\'s been a while since the last team sync. Consider scheduling one for this week.',
    approach: 'Check team calendars and send out a meeting invite.',
    keywords: ['meeting', 'calendar', 'team'],
    initialResponse: 'It\'s been 2 weeks since your last team sync. Based on everyone\'s availability, here are the best times this week:\n\n- **Wednesday 11am** - All 5 team members available\n- **Thursday 2pm** - 4 of 5 available (Sarah has a conflict)\n\nWould you like me to draft a meeting invite? I can include an agenda based on recent project activity.',
  },
]

// =============================================================================
// SERVICE CLASS
// =============================================================================

const MAX_SUGGESTIONS = 10

class FakeSuggestionService {
  private intervalId: NodeJS.Timeout | null = null
  private currentIndex = 0
  private isRunning = false

  /**
   * Starts generating fake suggestions every 10 seconds.
   */
  start(): void {
    if (this.isRunning) {
      console.log('Fake suggestion service already running')
      return
    }

    this.isRunning = true
    this.currentIndex = 0
    console.log('Fake suggestion service started - will add suggestion every 10 seconds')

    // Add first suggestion after 10 seconds
    this.intervalId = setInterval(() => {
      this.addFakeSuggestion()
    }, 10000)
  }

  /**
   * Stops generating fake suggestions.
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.isRunning = false
    console.log('Fake suggestion service stopped')
  }

  /**
   * Adds a fake suggestion to the data store.
   * Stops after MAX_SUGGESTIONS have been added.
   */
  private addFakeSuggestion(): void {
    // Stop after reaching max
    if (this.currentIndex >= MAX_SUGGESTIONS) {
      console.log(`Reached max suggestions (${MAX_SUGGESTIONS}), stopping fake suggestion service`)
      this.stop()
      return
    }

    const template = FAKE_SUGGESTIONS[this.currentIndex % FAKE_SUGGESTIONS.length]
    const timestamp = Date.now()

    const suggestion: Suggestion = {
      suggestionId: `sugg_${timestamp}_${Math.random().toString(36).slice(2, 8)}`,
      projectId: 1,
      title: template.title,
      description: template.description,
      initialPrompt: `Help me with: ${template.title}`,
      status: 'active',
      keywords: template.keywords,
      approach: template.approach,
      executionOutput: template.initialResponse,
      executionSummary: { title: '', description: '' },
      support: 0.7 + Math.random() * 0.3, // Random score between 0.7 and 1.0
      utilities: {
        taskNumber: this.currentIndex + 1,
        benefit: 0.8,
        falsePositiveCost: 0.2,
        falseNegativeCost: 0.3,
        decay: 0.1,
      },
      grounding: ['Detected from screen activity'],
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    dataStore.addSuggestion(suggestion)
    console.log(`Added fake suggestion: "${template.title}" (${this.currentIndex + 1}/${MAX_SUGGESTIONS})`)

    this.currentIndex++
  }

  /**
   * Returns whether the service is currently running.
   */
  getIsRunning(): boolean {
    return this.isRunning
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const fakeSuggestionService = new FakeSuggestionService()
