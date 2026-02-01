import './styles/global.css'
import './styles/layout.css'
import './styles/sidebar.css'
import './styles/cards.css'
import './styles/chat.css'
import './styles/pages.css'
import './styles/modals.css'
import './styles/popup.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { DataProvider } from './context/DataContext'
import { NavigationProvider } from './context/NavigationContext'
import App from './App'
import { PopupApp } from './popup/PopupApp'

// Check if we're in popup mode via query parameter
const isPopupMode = new URLSearchParams(window.location.search).get('popup') === 'true'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DataProvider>
      <NavigationProvider>
        {isPopupMode ? <PopupApp /> : <App />}
      </NavigationProvider>
    </DataProvider>
  </StrictMode>
)
