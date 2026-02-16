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
        <h1 className="welcome-title">Horizon</h1>
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
