import React, { useEffect } from 'react'
import { Sidebar } from './components/layout/Sidebar'
import { ContentArea } from './components/layout/ContentArea'

// Apply saved theme on app start
function applyInitialTheme(): void {
  const saved = localStorage.getItem('gumbo-theme')
  if (saved === 'dusk' || saved === 'light' || saved === 'dark') {
    document.documentElement.setAttribute('data-theme', saved)
  }
}

function App(): React.JSX.Element {
  useEffect(() => {
    applyInitialTheme()
  }, [])

  return (
    <div className="app-container">
      <Sidebar />
      <ContentArea />
    </div>
  )
}

export default App
