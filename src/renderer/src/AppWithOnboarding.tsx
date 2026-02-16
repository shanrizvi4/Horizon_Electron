/**
 * AppWithOnboarding Component
 *
 * Wrapper that checks if the user has completed onboarding.
 * Shows the onboarding flow on first launch, then the main app.
 */

import React, { useState, useEffect } from 'react'
import App from './App'
import { OnboardingFlow } from './components/onboarding'
import { useData } from './context/DataContext'

const hasElectronAPI = (): boolean => {
  return typeof window !== 'undefined' && window.api?.settings !== undefined
}

export const AppWithOnboarding: React.FC = () => {
  const { state } = useData()
  const [loading, setLoading] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    // Check if user has completed onboarding
    const checkOnboarding = async () => {
      if (!hasElectronAPI()) {
        // In dev/browser environment, skip onboarding
        setShowOnboarding(false)
        setLoading(false)
        return
      }

      try {
        // Use state from context which is already loaded
        if (state.settings?.hasCompletedOnboarding === false) {
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

    // Wait a tick for state to be available
    const timeout = setTimeout(checkOnboarding, 100)
    return () => clearTimeout(timeout)
  }, [state.settings?.hasCompletedOnboarding])

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
