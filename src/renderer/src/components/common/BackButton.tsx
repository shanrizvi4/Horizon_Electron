import React from 'react'
import { useAppNavigation } from '../../hooks/useNavigation'

export function BackButton(): React.JSX.Element | null {
  const { goBack, canGoBack } = useAppNavigation()

  if (!canGoBack()) {
    return null
  }

  return (
    <button className="btn btn-ghost" onClick={goBack}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
          clipRule="evenodd"
        />
      </svg>
      Back
    </button>
  )
}
