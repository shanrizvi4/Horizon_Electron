import React, { useEffect } from 'react'
import { PopupTray } from './PopupTray'

// Apply saved theme on popup start
function applyInitialTheme(): void {
  const saved = localStorage.getItem('gumbo-theme')
  if (saved === 'slate' || saved === 'light' || saved === 'dark') {
    document.documentElement.setAttribute('data-theme', saved)
  }
}

export function PopupApp(): React.JSX.Element {
  // Apply theme on mount and listen for changes
  useEffect(() => {
    applyInitialTheme()

    // Listen for storage changes (when main app changes theme)
    const handleStorageChange = (e: StorageEvent): void => {
      if (e.key === 'gumbo-theme' && e.newValue) {
        document.documentElement.setAttribute('data-theme', e.newValue)
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  return (
    <div className="popup-container">
      <PopupTray />
    </div>
  )
}
