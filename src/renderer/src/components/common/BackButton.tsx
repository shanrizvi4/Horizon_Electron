import React from 'react'
import { useAppNavigation } from '../../hooks/useNavigation'

export function BackButton(): React.JSX.Element | null {
  const { goBack, canGoBack } = useAppNavigation()

  if (!canGoBack()) {
    return null
  }

  return (
    <button className="btn btn-ghost" onClick={goBack} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'block' }}>
        <path d="M15 18l-6-6 6-6"/>
      </svg>
      Back
    </button>
  )
}
