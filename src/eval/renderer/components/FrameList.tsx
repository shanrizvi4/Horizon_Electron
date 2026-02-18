import React from 'react'

interface FrameSummary {
  frameId: string
  timestamp: number
  type: 'periodic' | 'before' | 'after'
  hasAnalysis: boolean
  gateDecision?: 'CONTINUE' | 'SKIP'
  contributedToSuggestions: number
}

interface FrameListProps {
  frames: FrameSummary[]
  selectedFrameId: string | null
  onFrameSelect: (frameId: string) => void
}

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  })
}

function getTypeLabel(type: 'periodic' | 'before' | 'after'): string {
  switch (type) {
    case 'periodic':
      return 'P'
    case 'before':
      return 'B'
    case 'after':
      return 'A'
  }
}

function getTypeTitle(type: 'periodic' | 'before' | 'after'): string {
  switch (type) {
    case 'periodic':
      return 'Periodic capture'
    case 'before':
      return 'Before action capture'
    case 'after':
      return 'After action capture'
  }
}

export function FrameList({
  frames,
  selectedFrameId,
  onFrameSelect
}: FrameListProps): React.JSX.Element {
  if (frames.length === 0) {
    return (
      <div className="eval-empty-list">
        <p>No frames found</p>
        <p className="eval-empty-hint">Start recording to capture frames</p>
      </div>
    )
  }

  return (
    <div className="eval-list">
      {frames.map((frame) => (
        <div
          key={frame.frameId}
          className={`eval-list-item ${selectedFrameId === frame.frameId ? 'selected' : ''}`}
          onClick={() => onFrameSelect(frame.frameId)}
        >
          <div className="eval-list-item-main">
            <div className="eval-frame-type" title={getTypeTitle(frame.type)}>
              {getTypeLabel(frame.type)}
            </div>
            <div className="eval-list-item-content">
              <div className="eval-list-item-id">{frame.frameId}</div>
              <div className="eval-list-item-time">{formatTimestamp(frame.timestamp)}</div>
            </div>
          </div>
          <div className="eval-list-item-badges">
            {frame.hasAnalysis && (
              <span className="eval-badge eval-badge-analysis" title="Frame has been analyzed">
                Analyzed
              </span>
            )}
            {frame.gateDecision && (
              <span
                className={`eval-badge ${frame.gateDecision === 'CONTINUE' ? 'eval-badge-continue' : 'eval-badge-skip'}`}
                title={`Gate: ${frame.gateDecision}`}
              >
                {frame.gateDecision === 'CONTINUE' ? 'Pass' : 'Skip'}
              </span>
            )}
            {frame.contributedToSuggestions > 0 && (
              <span
                className="eval-badge eval-badge-suggestions"
                title={`Contributed to ${frame.contributedToSuggestions} suggestion(s)`}
              >
                {frame.contributedToSuggestions}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
