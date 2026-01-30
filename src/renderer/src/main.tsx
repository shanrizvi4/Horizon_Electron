import './styles/global.css'
import './styles/layout.css'
import './styles/sidebar.css'
import './styles/cards.css'
import './styles/chat.css'
import './styles/pages.css'
import './styles/modals.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { DataProvider } from './context/DataContext'
import { NavigationProvider } from './context/NavigationContext'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DataProvider>
      <NavigationProvider>
        <App />
      </NavigationProvider>
    </DataProvider>
  </StrictMode>
)
