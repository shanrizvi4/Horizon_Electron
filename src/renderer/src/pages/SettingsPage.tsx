import React from 'react'
import { useData } from '../context/DataContext'

export function SettingsPage(): React.JSX.Element {
  const { state, dispatch } = useData()
  const { settings, studyStatus } = state

  const handleNotificationChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    dispatch({
      type: 'UPDATE_SETTINGS',
      payload: { notificationFrequency: parseInt(e.target.value, 10) }
    })
  }

  const handleToggle = (field: 'recordingEnabled' | 'disablePopup'): void => {
    dispatch({
      type: 'UPDATE_SETTINGS',
      payload: { [field]: !settings[field] }
    })
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
                  onClick={() => handleToggle('disablePopup')}
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
                  className={`toggle-switch ${settings.recordingEnabled ? 'active' : ''}`}
                  onClick={() => handleToggle('recordingEnabled')}
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
