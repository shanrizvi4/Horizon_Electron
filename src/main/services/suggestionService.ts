import { BrowserWindow } from 'electron'
import { dataStore } from './dataStore'
import type { Suggestion, Utilities } from '../types'

// Suggestion templates for mock generation
const SUGGESTION_TEMPLATES = [
  {
    titleTemplate: 'Review {topic} documentation',
    descriptionTemplate:
      'Based on your recent work, reviewing the {topic} documentation could help clarify best practices and potential improvements.',
    topics: ['API', 'authentication', 'database', 'testing', 'deployment', 'security']
  },
  {
    titleTemplate: 'Refactor {component} for better performance',
    descriptionTemplate:
      'The {component} could benefit from optimization. Consider reviewing render cycles and memory usage.',
    topics: ['dashboard', 'sidebar', 'data table', 'form handler', 'navigation', 'search bar']
  },
  {
    titleTemplate: 'Add error handling to {feature}',
    descriptionTemplate:
      'Improve robustness by adding comprehensive error handling to the {feature}. This will help with debugging and user experience.',
    topics: ['file upload', 'API calls', 'form submission', 'data export', 'user login', 'settings save']
  },
  {
    titleTemplate: 'Implement caching for {resource}',
    descriptionTemplate:
      'Adding a caching layer for {resource} could significantly improve load times and reduce server load.',
    topics: ['user data', 'API responses', 'images', 'configuration', 'search results', 'session data']
  },
  {
    titleTemplate: 'Write tests for {module}',
    descriptionTemplate:
      'The {module} currently lacks test coverage. Adding unit and integration tests will improve reliability.',
    topics: ['authentication', 'data processing', 'form validation', 'API integration', 'state management', 'routing']
  },
  {
    titleTemplate: 'Optimize {operation} queries',
    descriptionTemplate:
      'Database queries for {operation} could be optimized. Consider adding indexes or restructuring the query.',
    topics: ['user search', 'data listing', 'report generation', 'analytics', 'feed updates', 'notification fetch']
  },
  {
    titleTemplate: 'Add keyboard shortcuts for {action}',
    descriptionTemplate:
      'Power users would benefit from keyboard shortcuts for {action}. This improves accessibility and efficiency.',
    topics: ['navigation', 'saving', 'creating items', 'searching', 'toggling views', 'quick actions']
  },
  {
    titleTemplate: 'Implement {feature} validation',
    descriptionTemplate:
      'Adding proper validation to {feature} will prevent errors and improve data integrity.',
    topics: ['email input', 'password strength', 'file type', 'date range', 'numeric values', 'URL format']
  }
]

const APPROACHES = [
  'Start with a thorough analysis of the current implementation, then incrementally refactor',
  'Create a proof of concept first to validate the approach before full implementation',
  'Use established patterns and libraries to ensure maintainability',
  'Implement with feature flags to enable gradual rollout',
  'Build comprehensive tests first (TDD approach) for reliable implementation',
  'Focus on backwards compatibility while introducing improvements'
]

const GROUNDING_OPTIONS = [
  ['Recent code analysis', 'Performance metrics'],
  ['User feedback', 'Usage analytics'],
  ['Best practices research', 'Industry standards'],
  ['Error logs', 'Support tickets'],
  ['Code review findings', 'Technical debt analysis'],
  ['Accessibility audit', 'UX research']
]

class SuggestionService {
  private generationInterval: NodeJS.Timeout | null = null
  private isRunning = false
  private lastGenerationTime = 0
  private suggestionCounter = 100

  private readonly MIN_INTERVAL_MS = 30000 // 30 seconds
  private readonly MAX_INTERVAL_MS = 60000 // 60 seconds

  start(): void {
    if (this.isRunning) return

    console.log('Starting suggestion service')
    this.isRunning = true
    this.scheduleNextGeneration()
  }

  stop(): void {
    if (!this.isRunning) return

    console.log('Stopping suggestion service')
    this.isRunning = false

    if (this.generationInterval) {
      clearTimeout(this.generationInterval)
      this.generationInterval = null
    }
  }

  private scheduleNextGeneration(): void {
    if (!this.isRunning) return

    const delay = this.MIN_INTERVAL_MS + Math.random() * (this.MAX_INTERVAL_MS - this.MIN_INTERVAL_MS)

    this.generationInterval = setTimeout(() => {
      this.generateSuggestion()
      this.scheduleNextGeneration()
    }, delay)
  }

  private generateSuggestion(): void {
    // Skip if app is focused (don't interrupt user)
    const focusedWindow = BrowserWindow.getFocusedWindow()
    if (focusedWindow) {
      console.log('Skipping suggestion generation - app window is focused')
      return
    }

    // Rate limit: don't generate if too recent
    const now = Date.now()
    if (now - this.lastGenerationTime < this.MIN_INTERVAL_MS) {
      return
    }

    try {
      const suggestion = this.createMockSuggestion()
      dataStore.addSuggestion(suggestion)
      this.lastGenerationTime = now

      console.log(`Generated new suggestion: ${suggestion.title}`)
    } catch (error) {
      console.error('Failed to generate suggestion:', error)
    }
  }

  private createMockSuggestion(): Suggestion {
    // Pick random template
    const template = SUGGESTION_TEMPLATES[Math.floor(Math.random() * SUGGESTION_TEMPLATES.length)]
    const topic = template.topics[Math.floor(Math.random() * template.topics.length)]

    // Get or create project
    const projectId = this.getOrCreateProject()

    // Generate unique ID
    this.suggestionCounter++
    const suggestionId = `sug-gen-${Date.now()}-${this.suggestionCounter}`

    // Fill template
    const title = template.titleTemplate.replace('{topic}', topic)
      .replace('{component}', topic)
      .replace('{feature}', topic)
      .replace('{resource}', topic)
      .replace('{module}', topic)
      .replace('{operation}', topic)
      .replace('{action}', topic)

    const description = template.descriptionTemplate.replace('{topic}', topic)
      .replace('{component}', topic)
      .replace('{feature}', topic)
      .replace('{resource}', topic)
      .replace('{module}', topic)
      .replace('{operation}', topic)
      .replace('{action}', topic)

    // Generate random utilities
    const utilities: Utilities = {
      taskNumber: this.suggestionCounter,
      benefit: 0.5 + Math.random() * 0.5,
      falsePositiveCost: 0.05 + Math.random() * 0.25,
      falseNegativeCost: 0.1 + Math.random() * 0.4,
      decay: 0.03 + Math.random() * 0.12
    }

    const support = 0.5 + Math.random() * 0.5
    const approach = APPROACHES[Math.floor(Math.random() * APPROACHES.length)]
    const grounding = GROUNDING_OPTIONS[Math.floor(Math.random() * GROUNDING_OPTIONS.length)]

    // Generate keywords from title
    const keywords = title.toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 3)
      .slice(0, 4)

    const now = Date.now()

    const suggestion: Suggestion = {
      suggestionId,
      projectId,
      title,
      description,
      initialPrompt: `I'd like help with: ${title.toLowerCase()}`,
      status: 'active',
      keywords,
      approach,
      executionOutput: '',
      executionSummary: {
        title: title.split(' ').slice(0, 3).join(' '),
        description: 'Pending implementation'
      },
      support,
      utilities,
      grounding,
      createdAt: now,
      updatedAt: now
    }

    return suggestion
  }

  private getOrCreateProject(): number {
    const projects = dataStore.getActiveProjects()

    // 80% chance to assign to existing project, 20% to create new
    if (projects.length > 0 && Math.random() < 0.8) {
      return projects[Math.floor(Math.random() * projects.length)].projectId
    }

    // Create new project
    const projectNames = [
      'Code Quality Initiative',
      'Performance Optimization',
      'User Experience Improvements',
      'Technical Debt Reduction',
      'Feature Enhancement',
      'Security Hardening',
      'Accessibility Improvements',
      'Documentation Update'
    ]

    const projectGoals = [
      'Improve code maintainability and reduce technical debt',
      'Optimize application performance and reduce load times',
      'Enhance user experience and interface usability',
      'Address accumulated technical debt systematically',
      'Add new features based on user feedback',
      'Strengthen security measures and practices',
      'Improve accessibility for all users',
      'Update and improve documentation coverage'
    ]

    const nameIndex = Math.floor(Math.random() * projectNames.length)
    // Use ALL projects (including deleted) to avoid ID collision
    const allProjects = dataStore.getProjects()
    const maxId = Math.max(...allProjects.map(p => p.projectId), 0)
    const newProjectId = maxId + 1

    dataStore.addProject({
      projectId: newProjectId,
      title: projectNames[nameIndex],
      goal: projectGoals[nameIndex],
      status: 'active',
      suggestions: [],
      createdAt: Date.now()
    })

    return newProjectId
  }

  // Force generate a suggestion immediately (for testing)
  forceGenerate(): Suggestion | null {
    try {
      const suggestion = this.createMockSuggestion()
      dataStore.addSuggestion(suggestion)
      this.lastGenerationTime = Date.now()
      return suggestion
    } catch (error) {
      console.error('Failed to force generate suggestion:', error)
      return null
    }
  }
}

// Singleton instance
export const suggestionService = new SuggestionService()
