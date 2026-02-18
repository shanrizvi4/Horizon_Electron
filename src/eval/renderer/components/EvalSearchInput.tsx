import React, { useState, useCallback } from 'react'

interface EvalSearchInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: (value: string) => void
  placeholder?: string
}

export function EvalSearchInput({
  value,
  onChange,
  onSubmit,
  placeholder = 'Search...'
}: EvalSearchInputProps): React.JSX.Element {
  const [isFocused, setIsFocused] = useState(false)

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        onSubmit(value)
      }
    },
    [value, onSubmit]
  )

  return (
    <div className={`eval-search-input ${isFocused ? 'focused' : ''}`}>
      <svg
        className="eval-search-icon"
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M11.5 7a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zm-.82 4.74a6 6 0 111.06-1.06l3.04 3.04a.75.75 0 11-1.06 1.06l-3.04-3.04z"
          clipRule="evenodd"
        />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        className="eval-search-field"
      />
      {value && (
        <button className="eval-search-clear" onClick={() => onChange('')} title="Clear search">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M8 15A7 7 0 108 1a7 7 0 000 14zm2.78-4.22a.75.75 0 01-1.06 0L8 9.06l-1.72 1.72a.75.75 0 11-1.06-1.06L6.94 8 5.22 6.28a.75.75 0 011.06-1.06L8 6.94l1.72-1.72a.75.75 0 111.06 1.06L9.06 8l1.72 1.72a.75.75 0 010 1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}
    </div>
  )
}
