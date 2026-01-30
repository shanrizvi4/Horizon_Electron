import React from 'react'

interface TimeGroupHeaderProps {
  label: string
}

export function TimeGroupHeader({ label }: TimeGroupHeaderProps): React.JSX.Element {
  return (
    <div className="time-group-header">
      <span className="time-group-header-text">{label}</span>
      <div className="time-group-header-line" />
    </div>
  )
}
