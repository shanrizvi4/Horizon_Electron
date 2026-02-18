import React, { useState, useEffect } from 'react'
import { PipelineStep } from './PipelineStep'

interface FrameSummary {
  frameId: string
  timestamp: number
  type: 'periodic' | 'before' | 'after'
  hasAnalysis: boolean
  gateDecision?: 'CONTINUE' | 'SKIP'
  contributedToSuggestions: number
}

interface ScoringScores {
  benefit: number
  disruptionCost: number
  missCost: number
  decay: number
  combined: number
}

interface SuggestionSimilarity {
  suggestion1Id: string
  suggestion2Id: string
  similarity: number
  isDuplicate: boolean
  classification: string
  reason: string
}

interface SuggestionTrace {
  suggestionId: string
  title: string
  description: string
  approach: string
  keywords: string[]
  status: string
  support: number
  createdAt: number
  sourceFrames: FrameSummary[]
  generation?: {
    batchId: string
    rawSupport: number
    supportEvidence: string
    generatedAt: number
  }
  scoring?: {
    batchId: string
    scores: ScoringScores
    filterDecision: {
      passed: boolean
      reason: string
    }
    scoredAt: number
  }
  deduplication?: {
    batchId: string
    isUnique: boolean
    similarities: SuggestionSimilarity[]
    processedAt: number
  }
}

interface SuggestionDetailProps {
  suggestionId: string
  onFrameClick: (frameId: string) => void
}

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  })
}

function ScoreBar({
  label,
  value,
  color = 'default'
}: {
  label: string
  value: number
  color?: 'default' | 'benefit' | 'disruption' | 'miss' | 'decay' | 'combined'
}): React.JSX.Element {
  const percentage = Math.round(value * 100)
  return (
    <div className="eval-score-row">
      <span className="eval-score-label">{label}</span>
      <div className="eval-score-bar">
        <div
          className={`eval-score-fill eval-score-${color}`}
          style={{ width: `${percentage}%` }}
        />
        <span className="eval-score-value">{percentage}%</span>
      </div>
    </div>
  )
}

export function SuggestionDetail({
  suggestionId,
  onFrameClick
}: SuggestionDetailProps): React.JSX.Element {
  const [trace, setTrace] = useState<SuggestionTrace | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['info', 'frames', 'generation', 'scoring', 'dedup'])
  )
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set())

  const toggleField = (field: string): void => {
    setExpandedFields((prev) => {
      const next = new Set(prev)
      if (next.has(field)) {
        next.delete(field)
      } else {
        next.add(field)
      }
      return next
    })
  }

  useEffect(() => {
    const loadData = async (): Promise<void> => {
      setIsLoading(true)
      try {
        const data = await window.api.evaluation.getSuggestionTrace(suggestionId)
        setTrace(data)
      } catch (error) {
        console.error('Failed to load suggestion trace:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [suggestionId])

  const toggleSection = (section: string): void => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

  if (isLoading) {
    return (
      <div className="eval-detail-loading">
        <div className="spinner" />
        <p>Loading suggestion details...</p>
      </div>
    )
  }

  if (!trace) {
    return (
      <div className="eval-detail-error">
        <p>Suggestion not found</p>
      </div>
    )
  }

  return (
    <div className="eval-detail">
      <div className="eval-detail-header">
        <h2 className="eval-detail-title">{trace.title}</h2>
        <div className="eval-detail-meta">
          <span className={`eval-detail-status eval-status-${trace.status}`}>{trace.status}</span>
          <span className="eval-detail-support">Support: {(trace.support * 100).toFixed(0)}%</span>
          <span className="eval-detail-time">{formatTimestamp(trace.createdAt)}</span>
        </div>
        <div className="eval-detail-id">{trace.suggestionId}</div>
      </div>

      {/* Quick Links to Source Frames */}
      {trace.sourceFrames.length > 0 && (
        <div className="eval-nav-links">
          <span className="eval-nav-links-label">From {trace.sourceFrames.length} source frame{trace.sourceFrames.length > 1 ? 's' : ''}:</span>
          <ul className="eval-nav-links-list">
            {trace.sourceFrames.map((frame, i) => (
              <li key={frame.frameId}>
                <button
                  className="eval-nav-link"
                  onClick={() => onFrameClick(frame.frameId)}
                >
                  {i + 1}. {frame.frameId}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="eval-detail-steps">
        {/* Basic Info */}
        <PipelineStep
          title="Suggestion Info"
          isExpanded={expandedSections.has('info')}
          onToggle={() => toggleSection('info')}
          status="info"
        >
          <div className="eval-step-content">
            <div className="eval-field">
              <label>
                Description
                <button className="eval-description-toggle" onClick={() => toggleField('desc')}>
                  {expandedFields.has('desc') ? 'Collapse' : 'Expand'}
                </button>
              </label>
              <p className={`eval-description ${expandedFields.has('desc') ? 'expanded' : ''}`}>
                {trace.description}
              </p>
            </div>
            <div className="eval-field">
              <label>
                Approach
                <button className="eval-description-toggle" onClick={() => toggleField('approach')}>
                  {expandedFields.has('approach') ? 'Collapse' : 'Expand'}
                </button>
              </label>
              <p className={`eval-approach ${expandedFields.has('approach') ? 'expanded' : ''}`}>
                {trace.approach}
              </p>
            </div>
            <div className="eval-field">
              <label>Keywords</label>
              <div className="eval-tags">
                {trace.keywords.map((keyword, i) => (
                  <span key={i} className="eval-tag eval-tag-keyword">
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </PipelineStep>

        {/* Source Frames */}
        <PipelineStep
          title="Source Frames"
          isExpanded={expandedSections.has('frames')}
          onToggle={() => toggleSection('frames')}
          status={trace.sourceFrames.length > 0 ? 'complete' : 'pending'}
          badge={`${trace.sourceFrames.length}`}
        >
          {trace.sourceFrames.length > 0 ? (
            <div className="eval-frame-links">
              {trace.sourceFrames.map((frame) => (
                <button
                  key={frame.frameId}
                  className="eval-frame-link"
                  onClick={() => onFrameClick(frame.frameId)}
                >
                  <div className="eval-frame-link-icon">
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="eval-frame-link-info">
                    <span className="eval-frame-link-id">{frame.frameId}</span>
                    <span className="eval-frame-link-meta">
                      {frame.type} • {frame.hasAnalysis ? 'Analyzed' : 'Pending'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="eval-step-pending">
              <p>No source frames found</p>
            </div>
          )}
        </PipelineStep>

        {/* Generation */}
        <PipelineStep
          title="Generation"
          isExpanded={expandedSections.has('generation')}
          onToggle={() => toggleSection('generation')}
          status={trace.generation ? 'complete' : 'pending'}
        >
          {trace.generation ? (
            <div className="eval-step-content">
              <div className="eval-field eval-field-inline">
                <label>Batch</label>
                <span className="eval-batch-id">{trace.generation.batchId}</span>
              </div>
              <div className="eval-field eval-field-inline">
                <label>Raw Support</label>
                <span className="eval-raw-support">{trace.generation.rawSupport}/10</span>
              </div>
              <div className="eval-field">
                <label>
                  Support Evidence
                  <button className="eval-description-toggle" onClick={() => toggleField('evidence')}>
                    {expandedFields.has('evidence') ? 'Collapse' : 'Expand'}
                  </button>
                </label>
                <p className={`eval-description ${expandedFields.has('evidence') ? 'expanded' : ''}`}>
                  {trace.generation.supportEvidence}
                </p>
              </div>
            </div>
          ) : (
            <div className="eval-step-pending">
              <p>Generation data not available</p>
            </div>
          )}
        </PipelineStep>

        {/* Scoring */}
        <PipelineStep
          title="Scoring"
          isExpanded={expandedSections.has('scoring')}
          onToggle={() => toggleSection('scoring')}
          status={trace.scoring ? 'complete' : 'pending'}
        >
          {trace.scoring ? (
            <div className="eval-step-content">
              <div className="eval-scores">
                <ScoreBar label="Benefit" value={trace.scoring.scores.benefit} color="benefit" />
                <ScoreBar
                  label="Disruption"
                  value={trace.scoring.scores.disruptionCost}
                  color="disruption"
                />
                <ScoreBar label="Miss Cost" value={trace.scoring.scores.missCost} color="miss" />
                <ScoreBar label="Decay" value={trace.scoring.scores.decay} color="decay" />
                <ScoreBar
                  label="Combined"
                  value={trace.scoring.scores.combined}
                  color="combined"
                />
              </div>
              <div className="eval-field eval-field-inline">
                <label>Decision</label>
                <span
                  className={`eval-decision ${trace.scoring.filterDecision.passed ? 'success' : 'warning'}`}
                >
                  {trace.scoring.filterDecision.passed ? 'PASSED ✓' : 'FILTERED ✗'}
                </span>
              </div>
              <div className="eval-field">
                <label>Reason</label>
                <p>{trace.scoring.filterDecision.reason}</p>
              </div>
            </div>
          ) : (
            <div className="eval-step-pending">
              <p>Scoring data not available</p>
            </div>
          )}
        </PipelineStep>

        {/* Deduplication */}
        <PipelineStep
          title="Deduplication"
          isExpanded={expandedSections.has('dedup')}
          onToggle={() => toggleSection('dedup')}
          status={trace.deduplication ? 'complete' : 'pending'}
        >
          {trace.deduplication ? (
            <div className="eval-step-content">
              <div className="eval-field eval-field-inline">
                <label>Status</label>
                <span
                  className={`eval-decision ${trace.deduplication.isUnique ? 'success' : 'warning'}`}
                >
                  {trace.deduplication.isUnique ? 'Unique ✓' : 'Duplicate ✗'}
                </span>
              </div>
              {trace.deduplication.similarities.length > 0 && (
                <div className="eval-field">
                  <label>Similarity Comparisons</label>
                  <div className="eval-similarities">
                    {trace.deduplication.similarities.map((sim, i) => (
                      <div key={i} className="eval-similarity-item">
                        <div className="eval-similarity-header">
                          <span className="eval-similarity-pair">
                            vs {sim.suggestion1Id === suggestionId ? sim.suggestion2Id : sim.suggestion1Id}
                          </span>
                          <span className={`eval-similarity-score ${sim.isDuplicate ? 'duplicate' : ''}`}>
                            {(sim.similarity * 100).toFixed(0)}% similar
                          </span>
                        </div>
                        <p className="eval-similarity-reason">{sim.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="eval-step-pending">
              <p>Deduplication data not available</p>
            </div>
          )}
        </PipelineStep>
      </div>
    </div>
  )
}
