/**
 * Evaluation Module
 *
 * A self-contained module for pipeline evaluation and debugging.
 * This module provides tools to inspect frame analyses, suggestion traces,
 * and the full pipeline data flow.
 *
 * Structure:
 * - main/     - Main process services and IPC handlers
 * - preload/  - Preload API definitions (use with main app's preload)
 * - renderer/ - React components and styles
 */

// Main process exports
export * from './main'

// Renderer exports (for use in the main app)
export { EvaluationPage } from './renderer'
