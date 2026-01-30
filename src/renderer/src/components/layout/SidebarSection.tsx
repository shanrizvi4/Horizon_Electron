import React, { useState, ReactNode } from 'react'

interface SidebarSectionProps {
  title: string
  children: ReactNode
  defaultCollapsed?: boolean
}

export function SidebarSection({
  title,
  children,
  defaultCollapsed = false
}: SidebarSectionProps): React.JSX.Element {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)

  return (
    <div className="sidebar-section">
      <div className="sidebar-section-header" onClick={() => setCollapsed(!collapsed)}>
        <span className="sidebar-section-title">{title}</span>
        <span className={`sidebar-section-toggle ${collapsed ? 'collapsed' : ''}`}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <path d="M4 2l4 4-4 4" />
          </svg>
        </span>
      </div>
      <div className={`sidebar-section-content ${collapsed ? 'collapsed' : ''}`}>{children}</div>
    </div>
  )
}
