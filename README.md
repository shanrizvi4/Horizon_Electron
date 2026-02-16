# Horizon

A system that learns about you and your work to proactively help you get things done. Built with Electron, React, and TypeScript.

## Download

**[Download the latest release](https://github.com/shanrizvi4/Horizon_Electron/releases/latest)**

1. Download `gumbo-electron-1.0.0.dmg`
2. Open the DMG and drag Horizon to Applications
3. Launch and complete the onboarding flow

> Requires macOS (Apple Silicon)

## Features

- **Intelligent Suggestions** - Analyzes your screen activity to surface helpful suggestions
- **Popup Notifications** - Non-intrusive popup in the corner with actionable suggestions
- **Chat Interface** - Discuss suggestions with an AI assistant
- **Glass Morphism UI** - Modern liquid glass aesthetic with smooth animations
- **Privacy First** - All processing happens locally, data stays on your machine

## How It Works

```
Screen Capture → Frame Analysis → Suggestion Generation → Scoring → Deduplication → UI
```

1. **Screen Capture** - Periodically captures screenshots based on activity
2. **Frame Analysis** - Transcribes screen content using vision AI
3. **Suggestion Generation** - Generates actionable suggestions from observations
4. **Scoring & Filtering** - Ranks suggestions by relevance and urgency
5. **Deduplication** - Removes duplicate or similar suggestions
6. **UI** - Displays suggestions in the app and popup notifications

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build:mac
```

## Project Structure

```
src/
├── main/                       # Electron main process
│   ├── index.ts               # App entry, window management
│   ├── services/              # Backend services
│   │   ├── screenCapture.ts   # Screenshot capture
│   │   ├── pipelineService.ts # Orchestrates the suggestion pipeline
│   │   ├── frameAnalysisService.ts
│   │   ├── suggestionGenerationService.ts
│   │   ├── scoringFilteringService.ts
│   │   ├── deduplicationService.ts
│   │   ├── dataStore.ts       # Persistent state management
│   │   ├── mouseTracker.ts    # Popup trigger detection
│   │   └── permissionsService.ts
│   ├── ipc/                   # IPC handlers
│   │   ├── recording.ts       # Recording control
│   │   ├── permissions.ts     # macOS permissions
│   │   ├── suggestions.ts
│   │   ├── chats.ts
│   │   └── ...
│   └── types.ts               # Shared types
│
├── preload/                   # Bridge between main & renderer
│   └── index.ts
│
└── renderer/                  # React frontend
    └── src/
        ├── main.tsx           # React entry
        ├── AppWithOnboarding.tsx
        ├── pages/             # Page components
        │   ├── SuggestionsPage.tsx
        │   ├── ChatPage.tsx
        │   ├── SettingsPage.tsx
        │   └── ...
        ├── components/
        │   ├── onboarding/    # Onboarding flow
        │   ├── layout/        # Sidebar, content area
        │   ├── suggestions/   # Suggestion cards
        │   ├── chat/          # Chat interface
        │   └── ...
        ├── context/           # React contexts
        ├── styles/            # CSS
        └── popup/             # Popup window UI
```

## Architecture

### Main Process Services

| Service | Purpose |
|---------|---------|
| `screenCaptureService` | Captures screenshots based on mouse activity |
| `pipelineService` | Orchestrates the 5-step suggestion pipeline |
| `frameAnalysisService` | Transcribes screenshots using vision AI |
| `suggestionGenerationService` | Generates suggestions from transcriptions |
| `scoringFilteringService` | Scores and filters suggestions |
| `deduplicationService` | Removes duplicate suggestions |
| `dataStore` | Persists state to `data/state.json` |
| `mouseTrackerService` | Detects mouse in corner to trigger popup |
| `permissionsService` | Manages macOS permissions |

### IPC Channels

Communication between main and renderer processes:

- `recording:start/stop/getStatus` - Control screen capture
- `suggestions:*` - CRUD operations for suggestions
- `chats:*` - Chat management
- `permissions:*` - Permission checks and requests
- `state:onUpdate` - Real-time state sync to renderer

### Data Flow

```
Main Process                          Renderer Process
─────────────                         ────────────────
screenCapture → pipeline → dataStore ──IPC──→ DataContext → Components
                               ↑
                          state.json
```

## Onboarding

First-time users go through a 3-step onboarding:

1. **Welcome** - Introduction to Horizon
2. **Permissions** - Request screen recording (required) and accessibility (optional)
3. **Get Started** - Enable recording and launch

## Popup

A popup window appears in the bottom-left corner when the mouse moves there. Shows the latest suggestions for quick access.

## Design System

### Themes

Three themes available: Dusk (default), Light, Dark

### Liquid Glass Effect

```css
background: rgba(var(--glass-rgb), 0.06);
backdrop-filter: blur(10px);
border-radius: var(--radius-xl);

/* Liquid glass border */
&::before {
  background: linear-gradient(135deg,
    rgba(var(--glass-rgb), 0.18) 0%,
    rgba(var(--glass-rgb), 0.02) 50%,
    rgba(var(--glass-rgb), 0.18) 100%
  );
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
}
```

### Colors (Dusk Theme)

- Background: `#46576B`
- Glass overlay: `rgba(255, 255, 255, 0.06)`
- Text heading: `#E8E4DF`
- Text primary: `#D6CCBA`

## Configuration

### Environment Variables

For LLM integration, set in `.env`:

```
GEMINI_API_KEY=your_api_key
```

### Settings

User settings stored in `data/state.json`:

- `recordingEnabled` - Whether screen capture is active
- `notificationFrequency` - How often to show suggestions
- `disablePopup` - Disable popup notifications
- `hasCompletedOnboarding` - Skip onboarding on launch

## Building

```bash
# macOS (Apple Silicon)
npm run build:mac

# Output: dist/gumbo-electron-1.0.0.dmg
```

### Code Signing

For distribution, set environment variables:

```
APPLE_ID=your@email.com
APPLE_APP_SPECIFIC_PASSWORD=xxxx-xxxx-xxxx-xxxx
APPLE_TEAM_ID=XXXXXXXXXX
```

Then enable in `electron-builder.yml`:

```yaml
mac:
  hardenedRuntime: true
  notarize: true
```

## License

MIT
