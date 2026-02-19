/**
 * Theme Step Component
 *
 * Second step of the onboarding flow - lets the user choose their preferred theme.
 * Applies the theme immediately on selection.
 */

import React, { useState } from 'react'

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

interface ThemeStepProps {
  onNext: () => void
  onBack: () => void
}

export const ThemeStep: React.FC<ThemeStepProps> = ({ onNext, onBack }) => {
  const [selectedTheme, setSelectedTheme] = useState<ThemeType>(getInitialTheme)

  const handleThemeSelect = (theme: ThemeType) => {
    setSelectedTheme(theme)
    applyTheme(theme)
  }

  return (
    <div className="onboarding-step theme-step">
      <div className="onboarding-content">
        <h2 className="onboarding-title">Choose Your Theme</h2>
        <p className="onboarding-subtitle">
          Pick a look that feels right. You can always change this later in Settings.
        </p>

        <div className="theme-cards">
          {THEMES.map((theme) => (
            <button
              key={theme.value}
              className={`theme-card ${selectedTheme === theme.value ? 'active' : ''}`}
              onClick={() => handleThemeSelect(theme.value)}
            >
              <span
                className="theme-card-preview"
                data-theme-preview={theme.value}
              />
              <span className="theme-card-name">{theme.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="onboarding-actions">
        <button className="onboarding-btn-ghost" onClick={onBack}>
          Back
        </button>
        <button className="onboarding-btn-primary" onClick={onNext}>
          Continue
        </button>
      </div>
    </div>
  )
}
