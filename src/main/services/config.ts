/**
 * =============================================================================
 * CONFIG SERVICE
 * =============================================================================
 *
 * Manages application configuration including API keys.
 * Supports both environment variables and config file storage.
 *
 * CONFIGURATION SOURCES (in priority order):
 * 1. Environment variables (GEMINI_API_KEY or GOOGLE_API_KEY)
 * 2. Config file in user data directory (config.json)
 *
 * @module services/config
 */

import * as fs from 'fs'
import * as path from 'path'
import { app } from 'electron'

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Application configuration structure.
 */
interface AppConfig {
  /** Gemini API key for LLM calls */
  geminiApiKey?: string
}

// =============================================================================
// CONFIG SERVICE CLASS
// =============================================================================

/**
 * Service for managing application configuration.
 *
 * USAGE:
 * ```typescript
 * import { configService } from './services/config'
 *
 * // Initialize on app startup
 * configService.initialize()
 *
 * // Get API key (checks env vars first, then config file)
 * const apiKey = configService.getGeminiApiKey()
 *
 * // Set API key (saves to config file)
 * configService.setGeminiApiKey('your-api-key')
 * ```
 */
class ConfigService {
  /** Cached configuration */
  private config: AppConfig = {}

  /** Path to config file */
  private configPath: string = ''

  /**
   * Initializes the config service.
   *
   * Loads configuration from the config file in the user data directory.
   * Must be called during app startup.
   */
  initialize(): void {
    // Config file in app data directory
    const userDataPath = app.getPath('userData')
    this.configPath = path.join(userDataPath, 'config.json')

    // Also check project root config.json (for development)
    const projectConfigPath = path.join(process.cwd(), 'config.json')

    // Load existing config if available
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf-8')
        this.config = JSON.parse(data)
        console.log('Config loaded from:', this.configPath)
      } else if (fs.existsSync(projectConfigPath)) {
        // Fall back to project root config.json
        const data = fs.readFileSync(projectConfigPath, 'utf-8')
        const projectConfig = JSON.parse(data)
        // Map GEMINI_API_KEY to geminiApiKey
        if (projectConfig.GEMINI_API_KEY) {
          this.config.geminiApiKey = projectConfig.GEMINI_API_KEY
        }
        console.log('Config loaded from project root:', projectConfigPath)
      }
    } catch (error) {
      console.error('Error loading config:', error)
    }
  }

  /**
   * Gets the Gemini API key.
   *
   * Priority:
   * 1. GEMINI_API_KEY environment variable
   * 2. GOOGLE_API_KEY environment variable
   * 3. Config file (geminiApiKey field)
   *
   * @returns API key or null if not configured
   */
  getGeminiApiKey(): string | null {
    // Environment variable takes precedence
    const envKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
    if (envKey) {
      return envKey
    }

    // Fall back to config file
    return this.config.geminiApiKey || null
  }

  /**
   * Sets the Gemini API key.
   *
   * Saves the key to the config file for persistence.
   *
   * @param key - The API key to save
   */
  setGeminiApiKey(key: string): void {
    this.config.geminiApiKey = key
    this.saveConfig()
  }

  /**
   * Saves the current config to disk.
   */
  private saveConfig(): void {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2))
      console.log('Config saved to:', this.configPath)
    } catch (error) {
      console.error('Error saving config:', error)
    }
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

/**
 * Singleton instance of the ConfigService.
 */
export const configService = new ConfigService()
