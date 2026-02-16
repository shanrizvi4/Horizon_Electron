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

const hasElectronAPI = (): boolean => {
  return typeof window !== 'undefined' && window.api?.permissions !== undefined
}

export const PermissionsStep: React.FC<PermissionsStepProps> = ({ onNext, onBack }) => {
  const [permissions, setPermissions] = useState<PermissionStatus>({
    screenRecording: false,
    accessibility: false
  })
  const [checking, setChecking] = useState(true)

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
          Horizon needs a few permissions to work properly. We'll guide you through each one.
        </p>

        <div className="permissions-list">
          {/* Screen Recording - Required */}
          <div
            className={`permission-card ${permissions.screenRecording ? 'granted' : ''}`}
          >
            <div className="permission-icon">
              {permissions.screenRecording ? (
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              ) : (
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              )}
            </div>
            <div className="permission-info">
              <div className="permission-header">
                <h3 className="permission-title">Screen Recording</h3>
                <span className="permission-badge required">Required</span>
              </div>
              <p className="permission-description">
                Allows Horizon to capture screenshots and provide intelligent suggestions based on your
                screen activity.
              </p>
            </div>
            <div className="permission-action">
              {permissions.screenRecording ? (
                <span className="permission-status granted">Granted</span>
              ) : checking ? (
                <span className="permission-status checking">Checking...</span>
              ) : (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleRequestScreenRecording}
                >
                  Grant Permission
                </button>
              )}
            </div>
          </div>

          {/* Accessibility - Optional */}
          <div
            className={`permission-card ${permissions.accessibility ? 'granted' : ''}`}
          >
            <div className="permission-icon">
              {permissions.accessibility ? (
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              ) : (
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4l3 3" />
                </svg>
              )}
            </div>
            <div className="permission-info">
              <div className="permission-header">
                <h3 className="permission-title">Accessibility</h3>
                <span className="permission-badge optional">Optional</span>
              </div>
              <p className="permission-description">
                Enables enhanced features like automatic popup positioning and better window
                tracking.
              </p>
            </div>
            <div className="permission-action">
              {permissions.accessibility ? (
                <span className="permission-status granted">Granted</span>
              ) : checking ? (
                <span className="permission-status checking">Checking...</span>
              ) : (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleRequestAccessibility}
                >
                  Grant Permission
                </button>
              )}
            </div>
          </div>
        </div>

        {!permissions.screenRecording && !checking && (
          <p className="permissions-note">
            After clicking "Grant Permission", System Preferences will open. Toggle the switch next
            to Horizon to grant access, then return here.
          </p>
        )}
      </div>

      <div className="onboarding-actions">
        <button className="btn btn-ghost" onClick={onBack}>
          Back
        </button>
        <button
          className="btn btn-primary btn-lg onboarding-next-btn"
          onClick={onNext}
          disabled={!canContinue}
        >
          Continue
        </button>
      </div>
    </div>
  )
}
