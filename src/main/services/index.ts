// Core
export { dataStore } from './core/dataStore'
export { configService } from './core/config'

// Capture
export { screenCaptureService } from './capture/screenCapture'
export { mouseTrackerService } from './capture/mouseTracker'
export { permissionsService } from './capture/permissionsService'
export type { PermissionType, PermissionStatus } from './capture/permissionsService'

// Pipeline
export { pipelineService } from './pipeline/pipelineService'
export { frameAnalysisService } from './pipeline/frameAnalysisService'
export type { FrameAnalysis } from './pipeline/frameAnalysisService'
export { concentrationGateService } from './pipeline/concentrationGateService'
export { suggestionGenerationService } from './pipeline/suggestionGenerationService'
export { scoringFilteringService } from './pipeline/scoringFilteringService'
export { deduplicationService } from './pipeline/deduplicationService'

// LLM
export { chatService } from './llm/chatService'
export * from './llm/retrieval'

// User
export { userModelService } from './user/userModelService'
