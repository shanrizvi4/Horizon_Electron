/**
 * Features Step Component
 *
 * Third step of the onboarding flow - highlights 3 key features of the app.
 */

import React from 'react'

interface FeaturesStepProps {
  onNext: () => void
  onBack: () => void
}

export const FeaturesStep: React.FC<FeaturesStepProps> = ({ onNext, onBack }) => {
  return (
    <div className="onboarding-step features-step">
      <div className="onboarding-content">
        <h2 className="onboarding-title">Here's What Gumbo Can Do</h2>
        <p className="onboarding-subtitle">
          Discover how Gumbo helps you stay focused and productive throughout your day.
        </p>

        <div className="features-grid">
          {/* Smart Suggestions */}
          <div className="feature-card">
            <div className="feature-card-icon suggestions">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
            <h3 className="feature-card-title">Smart Suggestions</h3>
            <p className="feature-card-description">
              Gumbo analyzes your screen activity and suggests relevant tasks, actions, and next
              steps to keep you moving forward.
            </p>
          </div>

          {/* AI Chat */}
          <div className="feature-card">
            <div className="feature-card-icon chat">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
            </div>
            <h3 className="feature-card-title">AI Chat Assistant</h3>
            <p className="feature-card-description">
              Got a question about something you're working on? Chat with Gumbo's AI to get answers,
              explanations, and help.
            </p>
          </div>

          {/* Privacy First */}
          <div className="feature-card">
            <div className="feature-card-icon privacy">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <h3 className="feature-card-title">Privacy First</h3>
            <p className="feature-card-description">
              Your screenshots and data stay on your device. Gumbo processes everything locally and
              never uploads your screen content.
            </p>
          </div>
        </div>
      </div>

      <div className="onboarding-actions">
        <button className="btn btn-ghost" onClick={onBack}>
          Back
        </button>
        <button className="btn btn-primary btn-lg onboarding-next-btn" onClick={onNext}>
          Continue
        </button>
      </div>
    </div>
  )
}
