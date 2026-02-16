import React from 'react'
import type { SortMethod } from '../../types'

interface SortToggleProps {
  value: SortMethod
  onChange: (value: SortMethod) => void
}

export function SortToggle({ value, onChange }: SortToggleProps): React.JSX.Element {
  return (
    <div className="sort-toggle">
      <div className={`sort-toggle-indicator ${value === 'importance' ? 'right' : ''}`} />
      <button
        className={`sort-toggle-btn ${value === 'recent' ? 'active' : ''}`}
        onClick={() => onChange('recent')}
      >
        Recent
      </button>
      <button
        className={`sort-toggle-btn ${value === 'importance' ? 'active' : ''}`}
        onClick={() => onChange('importance')}
      >
        Important
      </button>
    </div>
  )
}
