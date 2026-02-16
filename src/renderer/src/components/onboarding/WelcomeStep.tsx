/**
 * Welcome Step Component
 *
 * First step of the onboarding flow - introduces the app and invites
 * the user to get started.
 */

import React from 'react'

interface WelcomeStepProps {
  onNext: () => void
}

export const WelcomeStep: React.FC<WelcomeStepProps> = ({ onNext }) => {
  return (
    <div className="onboarding-step welcome-step">
      <div className="onboarding-content">
        <div className="welcome-icon">
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M8 14s1.5 2 4 2 4-2 4-2" />
            <line x1="9" y1="9" x2="9.01" y2="9" />
            <line x1="15" y1="9" x2="15.01" y2="9" />
          </svg>
        </div>

        <h1 className="welcome-title">Welcome to Gumbo</h1>

        <p className="welcome-description">
          Gumbo watches your screen activity and provides intelligent suggestions to help you stay
          productive. Let's get you set up in just a few steps.
        </p>

        <div className="welcome-features">
          <div className="welcome-feature">
            <div className="welcome-feature-icon">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <span>Smart suggestions based on your work</span>
          </div>
          <div className="welcome-feature">
            <div className="welcome-feature-icon">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <span>AI chat to help you get things done</span>
          </div>
          <div className="welcome-feature">
            <div className="welcome-feature-icon">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <span>Your data stays private on your device</span>
          </div>
        </div>
      </div>

      <div className="onboarding-actions">
        <button className="btn btn-primary btn-lg onboarding-next-btn" onClick={onNext}>
          Get Started
        </button>
      </div>
    </div>
  )
}
