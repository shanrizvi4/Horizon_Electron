/**
 * Permissions Step Component
 *
 * Second step of the onboarding flow - requests screen recording permission
 * (required) and accessibility permission (optional).
 */

import React, { useState, useEffect, useCallback } from 'react'

interface PermissionsStepProps {
  onNext: () => void
  onBack: () => void
}

interface PermissionStatus {
  screenRecording: boolean
  accessibility: boolean
}

interface AnimatingStatus {
  screenRecording: boolean
  accessibility: boolean
}

const hasElectronAPI = (): boolean => {
  return typeof window !== 'undefined' && window.api?.permissions !== undefined
}

export const PermissionsStep: React.FC<PermissionsStepProps> = ({ onNext, onBack }) => {
  const [permissions, setPermissions] = useState<PermissionStatus>({
    screenRecording: false,
    accessibility: false
  })
  const [checking, setChecking] = useState(true)
  const [animating, setAnimating] = useState<AnimatingStatus>({
    screenRecording: false,
    accessibility: false
  })

  const checkPermissions = useCallback(async () => {
    if (!hasElectronAPI()) {
      // In dev/browser environment, simulate permissions granted
      setPermissions({ screenRecording: true, accessibility: true })
      setChecking(false)
      return
    }

    try {
      const status = await window.api.permissions.getAll()
      setPermissions(status)
    } catch (error) {
      console.error('Failed to check permissions:', error)
    } finally {
      setChecking(false)
    }
  }, [])

  useEffect(() => {
    checkPermissions()

    // Poll for permission changes (user might grant in System Preferences)
    const interval = setInterval(checkPermissions, 2000)
    return () => clearInterval(interval)
  }, [checkPermissions])

  const handleRequestScreenRecording = async () => {
    if (!hasElectronAPI()) return

    try {
      // First try requesting (triggers system dialog)
      await window.api.permissions.requestScreenRecording()
      // Then open System Preferences for manual grant
      await window.api.permissions.openPreferences('ScreenCapture')
      // Re-check after a delay
      setTimeout(checkPermissions, 1000)
    } catch (error) {
      console.error('Failed to request screen recording:', error)
    }
  }

  const handleRequestAccessibility = async () => {
    if (!hasElectronAPI()) return

    try {
      await window.api.permissions.requestAccessibility()
      await window.api.permissions.openPreferences('Accessibility')
      setTimeout(checkPermissions, 1000)
    } catch (error) {
      console.error('Failed to request accessibility:', error)
    }
  }

  const canContinue = permissions.screenRecording

  return (
    <div className="onboarding-step permissions-step">
      <div className="onboarding-content">
        <h2 className="onboarding-title">Set Up Permissions</h2>
        <p className="onboarding-subtitle">
          Horizon needs a few permissions to understand your workflow.
        </p>

        <div className="permissions-list">
          {/* Screen Recording - Required */}
          <div className={`permission-card ${permissions.screenRecording ? 'granted' : ''}`}>
            <div className="permission-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 3H4a1 1 0 0 0-1 1v3" />
                <path d="M17 3h3a1 1 0 0 1 1 1v3" />
                <path d="M21 17v3a1 1 0 0 1-1 1h-3" />
                <path d="M7 21H4a1 1 0 0 1-1-1v-3" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <div className="permission-info">
              <h3 className="permission-title">Screen Recording</h3>
              <p className="permission-description">
                Allows Horizon to see what you're working on and provide relevant suggestions.
              </p>
            </div>
            <div className="permission-action">
              <div className={`permission-btn-wrapper ${permissions.screenRecording || animating.screenRecording ? 'granted' : ''}`}>
                {permissions.screenRecording ? (
                  <span className="permission-status granted">
                    <svg className="checkmark-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                ) : checking ? (
                  <span className="permission-status checking">Checking...</span>
                ) : (
                  <button className="permission-btn" onClick={handleRequestScreenRecording}>
                    Grant Access
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Accessibility - Optional */}
          <div className={`permission-card ${permissions.accessibility ? 'granted' : ''}`}>
            <div className="permission-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
                <path d="M13 13l6 6" />
              </svg>
            </div>
            <div className="permission-info">
              <h3 className="permission-title">Accessibility</h3>
              <p className="permission-description">
                Enables enhanced features like automatic popup positioning.
              </p>
            </div>
            <div className="permission-action">
              <div className={`permission-btn-wrapper ${permissions.accessibility || animating.accessibility ? 'granted' : ''}`}>
                {permissions.accessibility ? (
                  <span className="permission-status granted">
                    <svg className="checkmark-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                ) : checking ? (
                  <span className="permission-status checking">Checking...</span>
                ) : (
                  <button className="permission-btn" onClick={handleRequestAccessibility}>
                    Grant Access
                  </button>
                )}
              </div>
            </div>
          </div>

        </div>

        {!permissions.screenRecording && !checking && (
          <p className="permissions-note">
            System Preferences will open. Toggle the switch next to Horizon, then return here.
          </p>
        )}
      </div>

      <div className="onboarding-actions">
        <button className="onboarding-btn-ghost" onClick={onBack}>
          Back
        </button>
        <button
          className="onboarding-btn-primary"
          onClick={onNext}
          disabled={!canContinue}
        >
          Continue
        </button>
      </div>
    </div>
  )
}
