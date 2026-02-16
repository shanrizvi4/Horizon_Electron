import type {
  Project,
  Suggestion,
  Chat,
  UserProposition,
  CustomizeAgentData,
  StudyStatus,
  AppSettings
} from '../types'

const now = Date.now()
const hour = 60 * 60 * 1000
const day = 24 * hour

export const mockSuggestions: Suggestion[] = [
  {
    suggestionId: 'sug-1',
    projectId: 1,
    title: 'Implement dark mode toggle',
    description:
      'Add a toggle switch in the settings page that allows users to switch between light and dark themes. The preference should persist across sessions.',
    initialPrompt: 'I want to add dark mode support to the app',
    status: 'active',
    keywords: ['UI', 'theme', 'settings', 'accessibility'],
    approach: 'Use CSS custom properties for theme colors and localStorage for persistence',
    executionOutput:
      'Created theme context with toggle functionality. Added CSS variables for both light and dark themes.',
    executionSummary: {
      title: 'Dark Mode Implementation',
      description: 'Theme toggle with persistence'
    },
    support: 0.85,
    utilities: {
      taskNumber: 1,
      benefit: 0.9,
      falsePositiveCost: 0.1,
      falseNegativeCost: 0.3,
      decay: 0.05
    },
    grounding: ['User preference survey results', 'Accessibility guidelines'],
    createdAt: now - 30 * 60 * 1000,
    updatedAt: now - 15 * 60 * 1000
  },
  {
    suggestionId: 'sug-2',
    projectId: 1,
    title: 'Add keyboard shortcuts',
    description:
      'Implement common keyboard shortcuts for navigation and actions. Include Cmd+K for search, Cmd+N for new items, and Escape to close modals.',
    initialPrompt: 'Can we add keyboard shortcuts for power users?',
    status: 'active',
    keywords: ['UX', 'keyboard', 'accessibility', 'navigation'],
    approach: 'Create a global keyboard event listener with a shortcut registry',
    executionOutput: '',
    executionSummary: {
      title: 'Keyboard Shortcuts',
      description: 'Global shortcut system'
    },
    support: 0.72,
    utilities: {
      taskNumber: 2,
      benefit: 0.7,
      falsePositiveCost: 0.15,
      falseNegativeCost: 0.2,
      decay: 0.08
    },
    grounding: ['Power user feedback', 'Industry standards'],
    createdAt: now - 2 * hour,
    updatedAt: now - hour
  },
  {
    suggestionId: 'sug-3',
    projectId: 2,
    title: 'Optimize image loading',
    description:
      'Implement lazy loading for images in the gallery view. Use intersection observer to load images only when they enter the viewport.',
    initialPrompt: 'The gallery is loading slowly with many images',
    status: 'active',
    keywords: ['performance', 'images', 'optimization', 'lazy-loading'],
    approach: 'Use Intersection Observer API with placeholder images',
    executionOutput: '',
    executionSummary: {
      title: 'Lazy Image Loading',
      description: 'Viewport-based image loading'
    },
    support: 0.91,
    utilities: {
      taskNumber: 3,
      benefit: 0.95,
      falsePositiveCost: 0.05,
      falseNegativeCost: 0.4,
      decay: 0.03
    },
    grounding: ['Performance metrics', 'User complaints about load times'],
    createdAt: now - 3 * hour,
    updatedAt: now - 2 * hour
  },
  {
    suggestionId: 'sug-4',
    projectId: 2,
    title: 'Add export functionality',
    description:
      'Allow users to export their data in CSV and JSON formats. Include options for selecting date ranges and specific data types.',
    initialPrompt: 'Users need to be able to export their data',
    status: 'active',
    keywords: ['export', 'data', 'CSV', 'JSON'],
    approach: 'Create export service with format handlers and streaming for large datasets',
    executionOutput: '',
    executionSummary: {
      title: 'Data Export',
      description: 'Multi-format data export'
    },
    support: 0.68,
    utilities: {
      taskNumber: 4,
      benefit: 0.65,
      falsePositiveCost: 0.2,
      falseNegativeCost: 0.25,
      decay: 0.1
    },
    grounding: ['Feature requests', 'Compliance requirements'],
    createdAt: now - 5 * hour,
    updatedAt: now - 4 * hour
  },
  {
    suggestionId: 'sug-5',
    projectId: 3,
    title: 'Implement search autocomplete',
    description:
      'Add autocomplete suggestions to the search bar. Show recent searches and popular queries as the user types.',
    initialPrompt: 'The search could be more helpful with suggestions',
    status: 'active',
    keywords: ['search', 'autocomplete', 'UX'],
    approach: 'Debounced search with cached suggestions and keyboard navigation',
    executionOutput: '',
    executionSummary: {
      title: 'Search Autocomplete',
      description: 'Smart search suggestions'
    },
    support: 0.78,
    utilities: {
      taskNumber: 5,
      benefit: 0.75,
      falsePositiveCost: 0.12,
      falseNegativeCost: 0.22,
      decay: 0.06
    },
    grounding: ['User behavior analytics', 'Competitor analysis'],
    createdAt: now - day,
    updatedAt: now - 20 * hour
  },
  {
    suggestionId: 'sug-6',
    projectId: 1,
    title: 'Add notification preferences',
    description:
      'Create a notification settings panel where users can configure which notifications they receive and how (email, push, in-app).',
    initialPrompt: 'Users want more control over notifications',
    status: 'complete',
    keywords: ['notifications', 'settings', 'preferences'],
    approach: 'Build notification preference schema with channel-based delivery',
    executionOutput:
      'Implemented notification preferences with granular controls for each notification type and delivery channel.',
    executionSummary: {
      title: 'Notification Preferences',
      description: 'User notification controls'
    },
    support: 0.82,
    utilities: {
      taskNumber: 6,
      benefit: 0.8,
      falsePositiveCost: 0.1,
      falseNegativeCost: 0.15,
      decay: 0.07
    },
    grounding: ['User feedback', 'Privacy requirements'],
    createdAt: now - 2 * day,
    updatedAt: now - day,
    closedAt: now - day
  },
  {
    suggestionId: 'sug-7',
    projectId: 3,
    title: 'Fix memory leak in dashboard',
    description:
      'Investigate and fix the memory leak occurring when switching between dashboard views. The issue causes increasing memory usage over time.',
    initialPrompt: 'The app gets slow after prolonged use',
    status: 'active',
    keywords: ['bug', 'performance', 'memory', 'dashboard'],
    approach: 'Profile memory usage, identify leaked references, implement proper cleanup',
    executionOutput: '',
    executionSummary: {
      title: 'Memory Leak Fix',
      description: 'Dashboard memory optimization'
    },
    support: 0.95,
    utilities: {
      taskNumber: 7,
      benefit: 0.98,
      falsePositiveCost: 0.02,
      falseNegativeCost: 0.5,
      decay: 0.02
    },
    grounding: ['Bug reports', 'Performance monitoring'],
    createdAt: now - 4 * hour,
    updatedAt: now - 3 * hour
  },
  {
    suggestionId: 'sug-8',
    projectId: 2,
    title: 'Add drag and drop reordering',
    description:
      'Enable drag and drop functionality for reordering items in lists. Support both mouse and touch interactions.',
    initialPrompt: 'Users want to manually reorder their items',
    status: 'active',
    keywords: ['UX', 'drag-drop', 'interaction', 'mobile'],
    approach: 'Use react-dnd or implement custom drag handling with pointer events',
    executionOutput: '',
    executionSummary: {
      title: 'Drag and Drop',
      description: 'List item reordering'
    },
    support: 0.63,
    utilities: {
      taskNumber: 8,
      benefit: 0.6,
      falsePositiveCost: 0.25,
      falseNegativeCost: 0.18,
      decay: 0.12
    },
    grounding: ['Feature requests', 'Usability testing'],
    createdAt: now - 6 * hour,
    updatedAt: now - 5 * hour
  },
  {
    suggestionId: 'sug-9',
    projectId: 1,
    title: 'Implement undo/redo system',
    description:
      'Add undo and redo functionality for destructive actions like deletions and edits. Show toast notification with undo option.',
    initialPrompt: 'Need ability to undo accidental deletions',
    status: 'active',
    keywords: ['UX', 'undo', 'history', 'safety'],
    approach: 'Implement command pattern with action history stack',
    executionOutput: '',
    executionSummary: {
      title: 'Undo/Redo System',
      description: 'Action history with undo'
    },
    support: 0.76,
    utilities: {
      taskNumber: 9,
      benefit: 0.72,
      falsePositiveCost: 0.18,
      falseNegativeCost: 0.28,
      decay: 0.09
    },
    grounding: ['User feedback', 'Best practices'],
    createdAt: now - 8 * hour,
    updatedAt: now - 7 * hour
  },
  {
    suggestionId: 'sug-10',
    projectId: 3,
    title: 'Add batch operations',
    description:
      'Allow users to select multiple items and perform bulk actions like delete, archive, or tag assignment.',
    initialPrompt: 'Need to perform actions on multiple items at once',
    status: 'closed',
    keywords: ['bulk', 'selection', 'efficiency'],
    approach: 'Multi-select mode with bulk action toolbar',
    executionOutput: '',
    executionSummary: {
      title: 'Batch Operations',
      description: 'Multi-item actions'
    },
    support: 0.58,
    utilities: {
      taskNumber: 10,
      benefit: 0.55,
      falsePositiveCost: 0.3,
      falseNegativeCost: 0.2,
      decay: 0.15
    },
    grounding: ['Power user requests'],
    createdAt: now - 3 * day,
    updatedAt: now - 2 * day,
    closedAt: now - 2 * day
  }
]

export const mockProjects: Project[] = [
  {
    projectId: 1,
    title: 'User Experience Improvements',
    goal: 'Enhance the overall user experience by implementing commonly requested features and improving existing interactions.',
    status: 'active',
    suggestions: mockSuggestions.filter((s) => s.projectId === 1),
    createdAt: now - 7 * day
  },
  {
    projectId: 2,
    title: 'Performance Optimization',
    goal: 'Improve application performance and reduce load times across all major features.',
    status: 'active',
    suggestions: mockSuggestions.filter((s) => s.projectId === 2),
    createdAt: now - 5 * day
  },
  {
    projectId: 3,
    title: 'Core Features Development',
    goal: 'Build essential features for the MVP release including search, dashboard, and batch operations.',
    status: 'active',
    suggestions: mockSuggestions.filter((s) => s.projectId === 3),
    createdAt: now - 10 * day
  },
  {
    projectId: 4,
    title: 'Mobile Responsiveness',
    goal: 'Ensure all features work properly on mobile devices with touch-friendly interactions.',
    status: 'open',
    suggestions: [],
    createdAt: now - 2 * day
  }
]

export const mockChats: Chat[] = [
  {
    id: 'chat-test',
    title: 'Test Chat for UI',
    messages: [
      {
        id: 'msg-test-1',
        role: 'user',
        content: 'This is a test message to help with UI development',
        isPlaceholder: false,
        isError: false
      },
      {
        id: 'msg-test-2',
        role: 'assistant',
        content: 'Got it! This is a response to help you test the UI styling and layout. Feel free to use this chat to experiment with different designs.',
        isPlaceholder: false,
        isError: false
      }
    ],
    hasReceivedInitialResponse: true,
    isLoadingResponse: false,
    createdAt: Date.now(),
    status: 'active'
  },
  {
    id: 'chat-1',
    title: 'Dark mode implementation',
    messages: [
      {
        id: 'msg-1',
        role: 'prompt',
        content: 'I want to add dark mode support to the app',
        isPlaceholder: false,
        isError: false
      },
      {
        id: 'msg-2',
        role: 'assistant',
        content:
          "I'll help you implement dark mode. Here's a plan:\n\n1. **Create CSS custom properties** for theme colors\n2. **Build a ThemeContext** to manage theme state\n3. **Add a toggle switch** in settings\n4. **Persist preference** in localStorage\n\nWould you like me to start with the CSS variables or the React context?",
        isPlaceholder: false,
        isError: false
      },
      {
        id: 'msg-3',
        role: 'user',
        content: "Let's start with the CSS variables",
        isPlaceholder: false,
        isError: false
      },
      {
        id: 'msg-4',
        role: 'assistant',
        content:
          "Here are the CSS custom properties for both themes:\n\n```css\n:root {\n  --bg-primary: #ffffff;\n  --bg-secondary: #f5f5f5;\n  --text-primary: #1a1a1a;\n  --text-secondary: #666666;\n}\n\n[data-theme='dark'] {\n  --bg-primary: #1a1a1a;\n  --bg-secondary: #2d2d2d;\n  --text-primary: #ffffff;\n  --text-secondary: #a0a0a0;\n}\n```\n\nNow let's create the ThemeContext to toggle between these themes.",
        isPlaceholder: false,
        isError: false
      }
    ],
    hasReceivedInitialResponse: true,
    isLoadingResponse: false,
    initialPrompt: 'I want to add dark mode support to the app',
    associatedProjectId: 1,
    associatedSuggestionId: 'sug-1',
    createdAt: now - 30 * 60 * 1000,
    status: 'active'
  },
  {
    id: 'chat-2',
    title: 'Performance profiling',
    messages: [
      {
        id: 'msg-5',
        role: 'user',
        content: 'How can I profile the memory usage in my React app?',
        isPlaceholder: false,
        isError: false
      },
      {
        id: 'msg-6',
        role: 'assistant',
        content:
          'There are several ways to profile memory usage in a React app:\n\n**1. Chrome DevTools Memory Panel**\n- Open DevTools (F12)\n- Go to Memory tab\n- Take heap snapshots before and after actions\n- Compare snapshots to identify leaks\n\n**2. React DevTools Profiler**\n- Install React DevTools extension\n- Use the Profiler tab to record renders\n- Identify components with excessive re-renders\n\n**3. Performance API**\n```javascript\nperformance.measureUserAgentSpecificMemory()\n  .then(result => console.log(result));\n```\n\nWould you like me to walk through any of these methods in detail?',
        isPlaceholder: false,
        isError: false
      }
    ],
    hasReceivedInitialResponse: true,
    isLoadingResponse: false,
    associatedProjectId: 3,
    createdAt: now - 2 * hour,
    status: 'active'
  },
  {
    id: 'chat-3',
    title: 'Export feature design',
    messages: [
      {
        id: 'msg-7',
        role: 'user',
        content: "What's the best way to implement data export in a web app?",
        isPlaceholder: false,
        isError: false
      },
      {
        id: 'msg-8',
        role: 'assistant',
        content:
          "For data export, I recommend a streaming approach for better performance with large datasets:\n\n**For CSV:**\n```javascript\nfunction exportToCSV(data, filename) {\n  const csv = data.map(row => \n    Object.values(row).join(',')\n  ).join('\\n');\n  \n  const blob = new Blob([csv], { type: 'text/csv' });\n  downloadBlob(blob, filename);\n}\n```\n\n**For JSON:**\n```javascript\nfunction exportToJSON(data, filename) {\n  const json = JSON.stringify(data, null, 2);\n  const blob = new Blob([json], { type: 'application/json' });\n  downloadBlob(blob, filename);\n}\n```\n\nFor very large datasets, consider using Web Workers to avoid blocking the UI thread.",
        isPlaceholder: false,
        isError: false
      }
    ],
    hasReceivedInitialResponse: true,
    isLoadingResponse: false,
    associatedProjectId: 2,
    associatedSuggestionId: 'sug-4',
    createdAt: now - 5 * hour,
    status: 'active'
  }
]

export const mockUserPropositions: UserProposition[] = [
  {
    id: 'prop-1',
    text: 'Prefers dark mode interfaces',
    editHistory: []
  },
  {
    id: 'prop-2',
    text: 'Values performance over visual polish',
    editHistory: ['Prefers fast interfaces']
  },
  {
    id: 'prop-3',
    text: 'Uses keyboard shortcuts frequently',
    editHistory: []
  },
  {
    id: 'prop-4',
    text: 'Works primarily on macOS',
    editHistory: []
  },
  {
    id: 'prop-5',
    text: 'Familiar with React and TypeScript',
    editHistory: ['Knows React', 'Familiar with React']
  }
]

export const mockAgentConfig: CustomizeAgentData = {
  focusMoreOn: 'Performance optimization, code quality, and best practices',
  focusLessOn: 'Visual styling details and CSS specifics',
  style: 'Concise and technical, with code examples when helpful'
}

export const mockStudyStatus: StudyStatus = {
  status: 'active',
  endTime: now + 30 * day
}

export const mockSettings: AppSettings = {
  notificationFrequency: 5,
  recordingEnabled: false,  // Default to OFF
  disablePopup: false,
  hasCompletedOnboarding: true // Mock data assumes onboarding is done
}
