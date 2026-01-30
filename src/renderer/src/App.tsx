import React from 'react'
import { Sidebar } from './components/layout/Sidebar'
import { ContentArea } from './components/layout/ContentArea'

function App(): React.JSX.Element {
  return (
    <div className="app-container">
      <Sidebar />
      <ContentArea />
    </div>
  )
}

export default App
