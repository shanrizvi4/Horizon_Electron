import React, { useState, useEffect } from 'react'
import { useData } from '../context/DataContext'

// Check if running in Electron with API available
const hasElectronAPI = (): boolean => {
  return typeof window !== 'undefined' && window.api && typeof window.api.recording?.getStatus === 'function'
}

type ThemeType = 'slate' | 'light' | 'dark'

const THEMES: { value: ThemeType; label: string }[] = [
  { value: 'slate', label: 'Slate' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' }
]

function getInitialTheme(): ThemeType {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('gumbo-theme')
    if (saved === 'slate' || saved === 'light' || saved === 'dark') {
      return saved
    }
  }
  return 'slate'
}

function applyTheme(theme: ThemeType): void {
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('gumbo-theme', theme)
}

export function SettingsPage(): React.JSX.Element {
  const { state, dispatch, syncToBackend } = useData()
  const { settings } = state
  // Start with null to show loading state, then get actual status from service
  const [isRecording, setIsRecording] = useState<boolean | null>(null)
  const [currentTheme, setCurrentTheme] = useState<ThemeType>(getInitialTheme)

  // Apply theme on mount
  useEffect(() => {
    applyTheme(currentTheme)
  }, [currentTheme])

  // Sync with actual recording service status - this is the single source of truth
  useEffect(() => {
    if (!hasElectronAPI()) {
      // Fallback for non-Electron: use settings
      setIsRecording(settings.recordingEnabled)
      return
    }

    // Get initial status from recording service (single source of truth)
    window.api.recording.getStatus().then((status) => {
      setIsRecording(status)
    })

    // Listen for status changes from recording service
    const unsubscribe = window.api.recording.onStatusChange((status: boolean) => {
      setIsRecording(status)
    })

    return unsubscribe
  }, [settings.recordingEnabled])

  const handleThemeChange = (theme: ThemeType): void => {
    setCurrentTheme(theme)
  }

  const handleNotificationChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const action = {
      type: 'UPDATE_SETTINGS' as const,
      payload: { notificationFrequency: parseInt(e.target.value, 10) }
    }
    dispatch(action)
    syncToBackend(action)
  }

  const handleRecordingToggle = async (): Promise<void> => {
    if (hasElectronAPI()) {
      // Control actual recording service
      if (isRecording) {
        await window.api.recording.stop()
      } else {
        await window.api.recording.start()
      }
      // Status will update via onStatusChange listener
    } else {
      // Fallback for non-Electron environment
      dispatch({
        type: 'UPDATE_SETTINGS',
        payload: { recordingEnabled: !settings.recordingEnabled }
      })
    }
  }

  const handlePopupToggle = (): void => {
    const action = {
      type: 'UPDATE_SETTINGS' as const,
      payload: { disablePopup: !settings.disablePopup }
    }
    dispatch(action)
    syncToBackend(action)
  }

  return (
    <div className="content-area">
      <div className="content-header">
        <div className="content-header-left">
          <h1 className="page-title">Settings</h1>
        </div>
      </div>
      <div className="content-body">
        <div className="page">
          <div className="settings-section">
            <h3 className="settings-section-title">Appearance</h3>
            <div className="settings-item">
              <div className="settings-item-info">
                <p className="settings-item-label">Theme</p>
                <p className="settings-item-description">Choose your preferred color scheme</p>
              </div>
              <div className="settings-item-control">
                <div className="theme-selector">
                  {THEMES.map((theme) => (
                    <button
                      key={theme.value}
                      className={`theme-option ${currentTheme === theme.value ? 'active' : ''}`}
                      onClick={() => handleThemeChange(theme.value)}

                    >
                      <span
                        className="theme-option-preview"
                        data-theme-preview={theme.value}
                      />
                      <span className="theme-option-label">{theme.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="settings-section">
            <h3 className="settings-section-title">Notifications</h3>
            <div className="settings-item">
              <div className="settings-item-info">
                <p className="settings-item-label">Notification Frequency</p>
                <p className="settings-item-description">
                  How often you receive suggestion notifications (1 = rarely, 10 = frequently)
                </p>
              </div>
              <div className="settings-item-control">
                <div className="custom-slider">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={settings.notificationFrequency}
                    onChange={handleNotificationChange}
                  />
                  <div className="custom-slider-knob" style={{ left: `calc(${((settings.notificationFrequency - 1) / 9) * 100}% - ${((settings.notificationFrequency - 1) / 9) * 22}px + 3px)` }} />
                </div>
              </div>
            </div>
            <div className="settings-item">
              <div className="settings-item-info">
                <p className="settings-item-label">Disable Popup Notifications</p>
                <p className="settings-item-description">
                  Turn off system popup notifications for new suggestions
                </p>
              </div>
              <div className="settings-item-control">
                <div
                  className={`toggle-switch ${settings.disablePopup ? 'active' : ''}`}
                  onClick={handlePopupToggle}
                >
                  <div className="toggle-switch-knob" />
                </div>
              </div>
            </div>
          </div>

          <div className="settings-section">
            <h3 className="settings-section-title">Recording</h3>
            <div className="settings-item">
              <div className="settings-item-info">
                <p className="settings-item-label">Enable Recording</p>
                <p className="settings-item-description">
                  Allow the agent to listen and learn from your activity (visual only in this demo)
                </p>
              </div>
              <div className="settings-item-control">
                <div
                  className={`toggle-switch ${isRecording === true ? 'active' : ''}`}
                  onClick={handleRecordingToggle}
                  style={{ opacity: isRecording === null ? 0.5 : 1 }}
                >
                  <div className="toggle-switch-knob" />
                </div>
              </div>
            </div>
          </div>

          <div className="settings-section">
            <h3 className="settings-section-title">Developer</h3>
            <div className="settings-item">
              <div className="settings-item-info">
                <p className="settings-item-label">Show Onboarding</p>
                <p className="settings-item-description">
                  Restart the onboarding flow from the beginning
                </p>
              </div>
              <div className="settings-item-control">
                <button
                  className="btn btn-secondary"
                  onClick={async () => {
                    if (hasElectronAPI()) {
                      await window.api.settings.update({ hasCompletedOnboarding: false })
                      window.location.reload()
                    }
                  }}
                >
                  Show Onboarding
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
