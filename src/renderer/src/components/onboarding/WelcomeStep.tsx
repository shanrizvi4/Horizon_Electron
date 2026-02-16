/**
 * Welcome Step Component
 *
 * First step of the onboarding flow - introduces the app and invites
 * the user to get started. Clean, minimal design.
 */

import React from 'react'

interface WelcomeStepProps {
  onNext: () => void
}

export const WelcomeStep: React.FC<WelcomeStepProps> = ({ onNext }) => {
  return (
    <div className="onboarding-step welcome-step">
      <div className="onboarding-content">
        <h1 className="welcome-title">Welcome to Horizon</h1>
        <p className="welcome-description">
          An AI that learns how you work and proactively helps you get things done.
        </p>
      </div>

      <div className="onboarding-actions">
        <button className="onboarding-btn-primary" onClick={onNext}>
          Get Started
        </button>
      </div>
    </div>
  )
}
