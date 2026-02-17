# Project Instructions for Claude

## Auto-commit on Feature Completion

When a feature, bug fix, or task is completed (either explicitly stated by the user saying things like "done", "that works", "perfect", "looks good", etc., or implicitly when the work is clearly finished and confirmed working), automatically commit the changes without waiting to be asked.

Use descriptive commit messages that summarize what was done.

## Clearing Pipeline Data & Restarting Fresh

Use this single bash command to clear everything and restart:

```bash
pkill -f "electron-vite" 2>/dev/null; pkill -f "Electron" 2>/dev/null; sleep 2 && \
cd /Users/shanrizvi/Desktop/HorizonDemo/horizon-demo/GUMBO2/GUMBO_Electron/data && \
rm -f screenshots/*.jpg screenshots/*.jpeg screenshots/*.png 2>/dev/null; \
rm -f frame_analysis/*.json 2>/dev/null; \
rm -f concentration_gate/*.json 2>/dev/null; \
rm -f suggestion_generation/*.json 2>/dev/null; \
rm -f scoring_filtering/*.json 2>/dev/null; \
rm -f deduplication/*.json 2>/dev/null && \
cat > state.json << 'EOF'
{
  "projects": [{"projectId": 1, "title": "LLM Generated Suggestions", "goal": "Suggestions from AI analysis", "status": "active", "suggestions": [], "createdAt": 1770414805704}],
  "suggestions": [],
  "chats": [],
  "userPropositions": [],
  "agentConfig": {"focusMoreOn": "", "focusLessOn": "", "style": ""},
  "studyStatus": {"status": "active", "endTime": 1773006783874},
  "settings": {"notificationFrequency": 5, "recordingEnabled": false, "disablePopup": false, "hasCompletedOnboarding": true, "onboardingCompletedAt": 1771295218037},
  "lastUpdateId": 0,
  "lastProcessedTimestamp": 0
}
EOF
cd /Users/shanrizvi/Desktop/HorizonDemo/horizon-demo/GUMBO2/GUMBO_Electron && npm run dev
```

Run this in background mode. It kills the server, waits, clears all pipeline data, resets state.json, and restarts.
