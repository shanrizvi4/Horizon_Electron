/**
 * AppWithOnboarding Component
 *
 * Wrapper that checks if the user has completed onboarding.
 * Shows the onboarding flow on first launch, then the main app.
 */

import React, { useState, useEffect } from 'react'
import App from './App'
import { OnboardingFlow } from './components/onboarding'

const hasElectronAPI = (): boolean => {
  return typeof window !== 'undefined' && window.api?.settings !== undefined
}

export const AppWithOnboarding: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    // Check if user has completed onboarding by fetching directly from backend
    const checkOnboarding = async () => {
      if (!hasElectronAPI()) {
        // In dev/browser environment, skip onboarding
        setShowOnboarding(false)
        setLoading(false)
        return
      }

      try {
        // Fetch settings directly from backend to get the real state
        const settings = await window.api.settings.get()
        console.log('Onboarding check - settings:', settings)

        // Show onboarding if not completed (false or undefined)
        if (!settings.hasCompletedOnboarding) {
          setShowOnboarding(true)
        } else {
          setShowOnboarding(false)
        }
      } catch (error) {
        console.error('Failed to check onboarding status:', error)
        setShowOnboarding(false)
      } finally {
        setLoading(false)
      }
    }

    checkOnboarding()
  }, [])

  const handleOnboardingComplete = async (enableRecording: boolean) => {
    if (!hasElectronAPI()) {
      setShowOnboarding(false)
      return
    }

    try {
      // Update settings to mark onboarding as complete
      await window.api.settings.update({
        hasCompletedOnboarding: true,
        onboardingCompletedAt: Date.now(),
        recordingEnabled: enableRecording
      })

      // Start recording if enabled
      if (enableRecording) {
        await window.api.recording.start()
      }

      setShowOnboarding(false)
    } catch (error) {
      console.error('Failed to complete onboarding:', error)
      // Still hide onboarding to not block the user
      setShowOnboarding(false)
    }
  }

  // Show loading state briefly while checking
  if (loading) {
    return (
      <div className="onboarding-container">
        <div className="onboarding-loading">
          <div className="loading-spinner" />
        </div>
      </div>
    )
  }

  // Show onboarding if not completed
  if (showOnboarding) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />
  }

  // Show main app
  return <App />
}
