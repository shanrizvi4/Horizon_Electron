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

        <h1 className="welcome-title">Welcome to Horizon</h1>

        <p className="welcome-description">
          Your AI-powered productivity assistant. Let's get you set up in just a few steps.
        </p>
      </div>

      <div className="onboarding-actions">
        <button className="btn btn-primary btn-lg onboarding-next-btn" onClick={onNext}>
          Get Started
        </button>
      </div>
    </div>
  )
}
