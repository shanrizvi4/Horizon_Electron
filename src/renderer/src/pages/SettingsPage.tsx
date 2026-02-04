import React, { useState, useEffect } from 'react'
import { useData } from '../context/DataContext'

// Check if running in Electron with API available
const hasElectronAPI = (): boolean => {
  return typeof window !== 'undefined' && window.api && typeof window.api.recording?.getStatus === 'function'
}

export function SettingsPage(): React.JSX.Element {
  const { state, dispatch, syncToBackend } = useData()
  const { settings, studyStatus } = state
  // Start with null to show loading state, then get actual status from service
  const [isRecording, setIsRecording] = useState<boolean | null>(null)

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

  const formatDate = (timestamp?: number): string => {
    if (!timestamp) return 'N/A'
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
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
            <h3 className="settings-section-title">Study Phase</h3>
            <div className="settings-item">
              <div className="settings-item-info">
                <p className="settings-item-label">Status</p>
                <p className="settings-item-description">Current study phase status</p>
              </div>
              <div className="settings-item-control">
                <div className="study-status">
                  <span className="study-status-dot" />
                  <span className="study-status-text">{studyStatus.status}</span>
                </div>
              </div>
            </div>
            {studyStatus.endTime && (
              <div className="settings-item">
                <div className="settings-item-info">
                  <p className="settings-item-label">End Date</p>
                  <p className="settings-item-description">When the current phase ends</p>
                </div>
                <div className="settings-item-control">
                  <span style={{ color: 'var(--text-primary)' }}>
                    {formatDate(studyStatus.endTime)}
                  </span>
                </div>
              </div>
            )}
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
                <div className="slider-container">
                  <input
                    type="range"
                    className="slider"
                    min="1"
                    max="10"
                    value={settings.notificationFrequency}
                    onChange={handleNotificationChange}
                  />
                  <span className="slider-value">{settings.notificationFrequency}</span>
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
        </div>
      </div>
    </div>
  )
}
