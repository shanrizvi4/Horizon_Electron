import React from 'react'

interface PipelineStepProps {
  title: string
  isExpanded: boolean
  onToggle: () => void
  status: 'pending' | 'complete' | 'info' | 'warning'
  badge?: string
  children: React.ReactNode
}

export function PipelineStep({
  title,
  isExpanded,
  onToggle,
  status,
  badge,
  children
}: PipelineStepProps): React.JSX.Element {
  return (
    <div className={`eval-pipeline-step eval-step-${status} ${isExpanded ? 'expanded' : ''}`}>
      <button className="eval-step-header" onClick={onToggle}>
        <div className="eval-step-indicator">
          {status === 'complete' && (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M8 15A7 7 0 108 1a7 7 0 000 14zm3.78-8.22a.75.75 0 00-1.06-1.06L7 9.44 5.28 7.72a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.06 0l4.25-4.25z"
                clipRule="evenodd"
              />
            </svg>
          )}
          {status === 'pending' && (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M8 15A7 7 0 108 1a7 7 0 000 14zm0-10.5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 018 4.5zm0 8a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
              />
            </svg>
          )}
          {status === 'info' && (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M8 15A7 7 0 108 1a7 7 0 000 14zm0-9a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 018 6zm0-2.5a1 1 0 100 2 1 1 0 000-2z"
                clipRule="evenodd"
              />
            </svg>
          )}
          {status === 'warning' && (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M8.22 1.754a.25.25 0 00-.44 0L1.698 13.132a.25.25 0 00.22.368h12.164a.25.25 0 00.22-.368L8.22 1.754zm-1.763-.707c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0114.082 15H1.918a1.75 1.75 0 01-1.543-2.575L6.457 1.047zM9 11a1 1 0 11-2 0 1 1 0 012 0zm-.25-5.25a.75.75 0 00-1.5 0v2.5a.75.75 0 001.5 0v-2.5z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>
        <span className="eval-step-title">{title}</span>
        {badge && <span className="eval-step-badge">{badge}</span>}
        <div className="eval-step-chevron">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M5.22 10.78a.75.75 0 010-1.06L8.44 6.5 5.22 3.28a.75.75 0 011.06-1.06l4 4a.75.75 0 010 1.06l-4 4a.75.75 0 01-1.06 0z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </button>
      {isExpanded && <div className="eval-step-body">{children}</div>}
    </div>
  )
}
