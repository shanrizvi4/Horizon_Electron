/**
 * Onboarding Flow Component
 *
 * Main container for the 3-step onboarding flow.
 * Manages step navigation and completion.
 */

import React, { useState } from 'react'
import { WelcomeStep } from './WelcomeStep'
import { PermissionsStep } from './PermissionsStep'
import { GetStartedStep } from './GetStartedStep'

type OnboardingStep = 'welcome' | 'permissions' | 'getStarted'

interface OnboardingFlowProps {
  onComplete: (enableRecording: boolean) => void
}

const STEPS: OnboardingStep[] = ['welcome', 'permissions', 'getStarted']

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome')

  const currentStepIndex = STEPS.indexOf(currentStep)

  const goToNext = () => {
    const nextIndex = currentStepIndex + 1
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex])
    }
  }

  const goToPrevious = () => {
    const prevIndex = currentStepIndex - 1
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex])
    }
  }

  const handleComplete = (enableRecording: boolean) => {
    onComplete(enableRecording)
  }

  return (
    <div className="onboarding-container">
      {/* Progress indicator - top of screen */}
      <div className="onboarding-progress">
        {STEPS.map((step, index) => (
          <div
            key={step}
            className={`progress-dot ${index === currentStepIndex ? 'active' : ''} ${index < currentStepIndex ? 'completed' : ''}`}
          />
        ))}
      </div>

      {/* Step content - centered */}
      {currentStep === 'welcome' && <WelcomeStep onNext={goToNext} />}
      {currentStep === 'permissions' && (
        <PermissionsStep onNext={goToNext} onBack={goToPrevious} />
      )}
      {currentStep === 'getStarted' && (
        <GetStartedStep onComplete={handleComplete} onBack={goToPrevious} />
      )}
    </div>
  )
}
