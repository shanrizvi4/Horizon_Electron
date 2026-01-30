import React from 'react'

interface SidebarButtonProps {
  icon: React.ReactNode
  label: string
  active?: boolean
  onClick: () => void
}

export function SidebarButton({
  icon,
  label,
  active = false,
  onClick
}: SidebarButtonProps): React.JSX.Element {
  return (
    <button className={`sidebar-button ${active ? 'active' : ''}`} onClick={onClick}>
      <span className="sidebar-button-icon">{icon}</span>
      <span>{label}</span>
    </button>
  )
}
