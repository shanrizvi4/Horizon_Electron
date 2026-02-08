import * as fs from 'fs'
import * as path from 'path'
import { dataStore } from './dataStore'
import { screenCaptureService } from './screenCapture'

interface FrameAnalysisResult {
  frameId: string
  analysis: string
  usedLLM: boolean
}

class FrameAnalysisService {
  /**
   * Test the LLM with a single frame from recent screenshots
   * Returns the analysis result or null if no frames available
   */
  async testSingleFrameWithLLM(): Promise<FrameAnalysisResult | null> {
    try {
      // Get the most recent screenshot
      const screenshots = await screenCaptureService.getRecentScreenshots(1)

      if (screenshots.length === 0) {
        console.log('No screenshots available for LLM test')
        return null
      }

      const screenshotPath = screenshots[0]
      const frameId = path.basename(screenshotPath, '.jpg')

      // Check if we have an API key configured
      const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY

      if (!apiKey) {
        console.log('No Gemini API key configured, returning mock analysis')
        return {
          frameId,
          analysis: 'Mock analysis: No API key configured. Set GEMINI_API_KEY to enable real LLM analysis.',
          usedLLM: false
        }
      }

      // Read the image file
      const imageBuffer = await fs.promises.readFile(screenshotPath)
      const base64Image = imageBuffer.toString('base64')

      // Call Gemini API
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: 'Analyze this screenshot. Describe what the user is doing, what applications are visible, and suggest what task they might be working on. Be concise.'
                  },
                  {
                    inline_data: {
                      mime_type: 'image/jpeg',
                      data: base64Image
                    }
                  }
                ]
              }
            ]
          })
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Gemini API error:', errorText)
        return {
          frameId,
          analysis: `API Error: ${response.status} - ${errorText}`,
          usedLLM: false
        }
      }

      const data = await response.json()
      const analysisText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No analysis generated'

      return {
        frameId,
        analysis: analysisText,
        usedLLM: true
      }
    } catch (error) {
      console.error('Frame analysis error:', error)
      return null
    }
  }
}

export const frameAnalysisService = new FrameAnalysisService()
