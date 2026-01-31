# Horizon Electron

A desktop AI assistant built with Electron, React, and TypeScript. Features a liquid glass UI aesthetic with suggestions, projects, chat, and memory management.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build:mac    # macOS
npm run build:win    # Windows
npm run build:linux  # Linux
```

## Project Structure

```
src/
├── main/                    # Electron main process
│   └── index.ts            # Main entry, creates browser window
├── preload/                 # Preload scripts (bridge between main & renderer)
│   └── index.ts
└── renderer/               # React frontend (the actual UI)
    └── src/
        ├── App.tsx         # Root component
        ├── main.tsx        # React entry point
        ├── types/          # TypeScript type definitions
        ├── context/        # React contexts (global state)
        ├── hooks/          # Custom React hooks
        ├── pages/          # Page components
        ├── components/     # Reusable UI components
        ├── styles/         # CSS files
        └── data/           # Mock data
```

## Key Directories

### `/pages`
Full-page views rendered based on navigation state:
- `SuggestionsPage.tsx` - Main dashboard with AI suggestions
- `ProjectsPage.tsx` - List of all projects
- `ProjectDetailsPage.tsx` - Individual project view
- `ChatPage.tsx` - Conversation interface
- `UserModelPage.tsx` - Memory/stored facts about user
- `CustomizeAgentPage.tsx` - AI personality settings
- `SettingsPage.tsx` - App settings

### `/components`
Reusable UI components organized by feature:
```
components/
├── layout/
│   ├── Sidebar.tsx         # Main navigation sidebar
│   └── ContentArea.tsx     # Main content wrapper
├── common/
│   ├── SearchBar.tsx
│   ├── SortToggle.tsx
│   ├── BackButton.tsx
│   └── TimeGroupHeader.tsx
├── suggestions/
│   ├── SuggestionCard.tsx
│   ├── SuggestionList.tsx
│   └── SuggestionActions.tsx
├── projects/
│   ├── ProjectCard.tsx
│   └── ProjectHeader.tsx
├── chat/
│   ├── ChatView.tsx
│   ├── MessageBubble.tsx
│   ├── MessageInput.tsx
│   └── StreamingIndicator.tsx
└── modals/
    ├── Modal.tsx           # Base modal component
    └── [specific modals]
```

### `/context`
Global state management using React Context:
- `NavigationContext.tsx` - Current page, selected chat/project, navigation history
- `DataContext.tsx` - All app data (suggestions, projects, chats, user model)

### `/hooks`
Custom hooks that encapsulate logic:
- `useNavigation.ts` - Navigation actions (navigateTo, goBack, openChat, etc.)
- `useSuggestions.ts` - Suggestion filtering, sorting, actions
- `useProjects.ts` - Project CRUD operations
- `useChat.ts` - Chat message handling

### `/styles`
CSS organized by concern:
- `variables.css` - Design tokens (colors, spacing, typography, etc.)
- `global.css` - Base styles, buttons, inputs, utilities
- `layout.css` - Page layouts, grids, content areas
- `sidebar.css` - Sidebar-specific styles
- `cards.css` - Suggestion and project cards
- `chat.css` - Chat interface styles
- `pages.css` - Page-specific styles (settings, memory, etc.)
- `modals.css` - Modal styles

## Design System

### Colors
The app uses a muted blue-grey palette with cream/beige text:
- Base: `#46576B` (blue-grey)
- Text: `#D6CCBA` (cream)
- Backgrounds: `rgba(255, 255, 255, 0.1)` layers

### Liquid Glass Effect
Key elements use a "liquid glass" effect:
```css
background: rgba(40, 48, 61, 0.75);
backdrop-filter: blur(12px);
border: 1px solid rgba(255, 255, 255, 0.1);
box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
```

### Text Shadows
For readability on glass surfaces:
```css
text-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
```

## Navigation

Navigation is managed through `NavigationContext`. Key concepts:
- `currentPage` - Which main page is shown (suggestions, projects, settings, etc.)
- `selectedChatId` - When set, shows ChatPage
- `selectedProjectId` - When set, shows ProjectDetailsPage
- History is tracked for back navigation

```tsx
const { navigateTo, openChat, openProject, goBack } = useNavigation()

navigateTo('settings')     // Go to settings page
openChat('chat-123')       // Open a specific chat
openProject('proj-456')    // Open a project
goBack()                   // Return to previous state
```

## Data Flow

1. `DataContext` holds all app state (suggestions, projects, chats, user propositions)
2. Components read state via `useData()` hook
3. Actions dispatch to reducer: `dispatch({ type: 'ACTION_TYPE', payload: {...} })`
4. Mock data in `/data/mockData.ts` seeds initial state

## Development Tips

### Adding a New Page
1. Create component in `/pages/NewPage.tsx`
2. Add page type to `/types/index.ts`
3. Add route in `ContentArea.tsx`
4. Add sidebar nav item in `Sidebar.tsx`

### Adding Styles
1. Use CSS variables from `variables.css`
2. Follow the glass effect pattern for interactive elements
3. Add text-shadow to text on glass surfaces
4. Use `rgba(255, 255, 255, x)` for borders/backgrounds

### Component Patterns
- Pages handle layout and data fetching
- Components are presentational where possible
- Hooks encapsulate business logic
- Context provides global state

## IDE Setup

Recommended: [VS Code](https://code.visualstudio.com/) with:
- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
- [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
