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
  },
  {
    title: 'Respond to Slack message',
    description: 'You have an unread message from the team channel about the upcoming sprint planning.',
    approach: 'Open Slack, read the message, and respond with your availability.',
    keywords: ['slack', 'communication', 'team'],
  },
  {
    title: 'Update project documentation',
    description: 'The README file is outdated and doesn\'t reflect the recent API changes.',
    approach: 'Open the README.md file and update the API endpoints section.',
    keywords: ['documentation', 'readme', 'api'],
  },
  {
    title: 'Fix failing test',
    description: 'The CI pipeline is showing a failing test in the user authentication module.',
    approach: 'Run the tests locally, identify the issue, and push a fix.',
    keywords: ['testing', 'ci', 'bug fix'],
  },
  {
    title: 'Schedule team sync',
    description: 'It\'s been a while since the last team sync. Consider scheduling one for this week.',
    approach: 'Check team calendars and send out a meeting invite.',
    keywords: ['meeting', 'calendar', 'team'],
  },
]

// =============================================================================
// SERVICE CLASS
// =============================================================================

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
   */
  private addFakeSuggestion(): void {
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
      executionOutput: '',
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
    console.log(`Added fake suggestion: "${template.title}" (${this.currentIndex + 1}/5 in cycle)`)

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
