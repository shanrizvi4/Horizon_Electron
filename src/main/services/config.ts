import * as fs from 'fs'
import * as path from 'path'
import { app } from 'electron'

interface AppConfig {
  geminiApiKey?: string
}

class ConfigService {
  private config: AppConfig = {}
  private configPath: string = ''

  initialize(): void {
    // Config file in app data directory
    const userDataPath = app.getPath('userData')
    this.configPath = path.join(userDataPath, 'config.json')

    // Load existing config if available
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf-8')
        this.config = JSON.parse(data)
      }
    } catch (error) {
      console.error('Error loading config:', error)
    }
  }

  /**
   * Get the Gemini API key from environment variable or config file
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
   * Set the Gemini API key in the config file
   */
  setGeminiApiKey(key: string): void {
    this.config.geminiApiKey = key
    this.saveConfig()
  }

  private saveConfig(): void {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2))
    } catch (error) {
      console.error('Error saving config:', error)
    }
  }
}

export const configService = new ConfigService()
