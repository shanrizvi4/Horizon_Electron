/**
 * Get Started Step Component
 *
 * Final step of the onboarding flow - allows user to enable recording
 * and complete the setup.
 */

import React, { useState } from 'react'

interface GetStartedStepProps {
  onComplete: (enableRecording: boolean) => void
  onBack: () => void
}

export const GetStartedStep: React.FC<GetStartedStepProps> = ({ onComplete, onBack }) => {
  const [enableRecording, setEnableRecording] = useState(true)

  const handleComplete = () => {
    onComplete(enableRecording)
  }

  return (
    <div className="onboarding-step get-started-step">
      <div className="onboarding-content">
        <div className="get-started-icon">
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>

        <h2 className="onboarding-title">You're All Set</h2>
        <p className="onboarding-subtitle">
          Horizon is ready to help you stay productive.
        </p>

        <div className="recording-toggle-card">
          <div className="recording-toggle-content">
            <div className="recording-toggle-icon">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <div className="recording-toggle-info">
              <h4 className="recording-toggle-title">Enable Recording</h4>
              <p className="recording-toggle-description">
                Start capturing now. Change this anytime in Settings.
              </p>
            </div>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={enableRecording}
              onChange={(e) => setEnableRecording(e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>

      <div className="onboarding-actions">
        <button className="btn btn-ghost" onClick={onBack}>
          Back
        </button>
        <button className="btn btn-primary btn-lg onboarding-next-btn" onClick={handleComplete}>
          Start Using Horizon
        </button>
      </div>
    </div>
  )
}
