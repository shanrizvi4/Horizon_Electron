import React, { useState, useEffect } from 'react'
import { PipelineStep } from './PipelineStep'
import { ScreenshotViewer } from './ScreenshotViewer'

interface FrameAnalysis {
  frameId: string
  framePath: string
  timestamp: number
  analysis: {
    description: string
    activities: string[]
    applications: string[]
    keywords: string[]
  }
  processedAt: number
  usedLLM: boolean
}

interface GateResult {
  frameId: string
  decision: 'CONTINUE' | 'SKIP'
  importance: number
  reason: string
  processedAt: number
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

interface FrameSuggestionInfo {
  suggestionId: string
  title: string
  description: string
  approach: string
  keywords: string[]
  status: string
  support: number
  rawSupport: number
  scores?: ScoringScores
  filterDecision?: {
    passed: boolean
    reason: string
  }
  deduplication?: {
    isUnique: boolean
    similarities: SuggestionSimilarity[]
  }
}

interface FrameTrace {
  frameId: string
  timestamp: number
  screenshotPath: string
  type: 'periodic' | 'before' | 'after'
  analysis?: FrameAnalysis
  gateResult?: GateResult
  contributedTo: string[]
  suggestions: FrameSuggestionInfo[]
}

interface FrameDetailProps {
  frameId: string
  onSuggestionClick: (suggestionId: string) => void
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

function getTypeLabel(type: 'periodic' | 'before' | 'after'): string {
  switch (type) {
    case 'periodic':
      return 'Periodic Capture'
    case 'before':
      return 'Before Action'
    case 'after':
      return 'After Action'
  }
}

export function FrameDetail({
  frameId,
  onSuggestionClick
}: FrameDetailProps): React.JSX.Element {
  const [trace, setTrace] = useState<FrameTrace | null>(null)
  const [screenshot, setScreenshot] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['analysis', 'gate', 'suggestions'])
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
        const [traceData, screenshotData] = await Promise.all([
          window.api.evaluation.getFrameTrace(frameId),
          window.api.evaluation.getScreenshot(frameId)
        ])
        setTrace(traceData)
        setScreenshot(screenshotData)
      } catch (error) {
        console.error('Failed to load frame trace:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [frameId])

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
        <p>Loading frame details...</p>
      </div>
    )
  }

  if (!trace) {
    return (
      <div className="eval-detail-error">
        <p>Frame not found</p>
      </div>
    )
  }

  return (
    <div className="eval-detail">
      <div className="eval-detail-header">
        <h2 className="eval-detail-title">Frame: {trace.frameId}</h2>
        <div className="eval-detail-meta">
          <span className="eval-detail-type">{getTypeLabel(trace.type)}</span>
          <span className="eval-detail-time">{formatTimestamp(trace.timestamp)}</span>
        </div>
      </div>

      {/* Quick Links to Suggestions */}
      {trace.suggestions.length > 0 && (
        <div className="eval-nav-links">
          <span className="eval-nav-links-label">Contributed to {trace.suggestions.length} suggestion{trace.suggestions.length > 1 ? 's' : ''}:</span>
          <ul className="eval-nav-links-list">
            {trace.suggestions.map((s, i) => (
              <li key={s.suggestionId}>
                <button
                  className="eval-nav-link"
                  onClick={() => onSuggestionClick(s.suggestionId)}
                >
                  {i + 1}. {s.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {screenshot && (
        <div className="eval-detail-screenshot">
          <ScreenshotViewer src={screenshot} alt={`Screenshot for ${trace.frameId}`} />
        </div>
      )}

      <div className="eval-detail-steps">
        {/* Step 1: Frame Analysis */}
        <PipelineStep
          title="Step 1: Frame Analysis"
          isExpanded={expandedSections.has('analysis')}
          onToggle={() => toggleSection('analysis')}
          status={trace.analysis ? 'complete' : 'pending'}
        >
          {trace.analysis ? (
            <div className="eval-step-content">
              <div className="eval-field">
                <label>
                  Description
                  <button
                    className="eval-description-toggle"
                    onClick={() => toggleField('analysis-desc')}
                  >
                    {expandedFields.has('analysis-desc') ? 'Collapse' : 'Expand'}
                  </button>
                </label>
                <p className={`eval-description ${expandedFields.has('analysis-desc') ? 'expanded' : ''}`}>
                  {trace.analysis.analysis.description}
                </p>
              </div>
              <div className="eval-field">
                <label>Activities</label>
                <div className="eval-tags">
                  {trace.analysis.analysis.activities.map((activity, i) => (
                    <span key={i} className="eval-tag">
                      {activity}
                    </span>
                  ))}
                </div>
              </div>
              <div className="eval-field">
                <label>Applications</label>
                <div className="eval-tags">
                  {trace.analysis.analysis.applications.map((app, i) => (
                    <span key={i} className="eval-tag">
                      {app}
                    </span>
                  ))}
                </div>
              </div>
              <div className="eval-field">
                <label>Keywords</label>
                <div className="eval-tags eval-tags-keywords">
                  {trace.analysis.analysis.keywords.slice(0, 15).map((keyword, i) => (
                    <span key={i} className="eval-tag eval-tag-keyword">
                      {keyword}
                    </span>
                  ))}
                  {trace.analysis.analysis.keywords.length > 15 && (
                    <span className="eval-tag eval-tag-more">
                      +{trace.analysis.analysis.keywords.length - 15} more
                    </span>
                  )}
                </div>
              </div>
              <div className="eval-field eval-field-inline">
                <label>Used LLM</label>
                <span className={`eval-indicator ${trace.analysis.usedLLM ? 'success' : 'info'}`}>
                  {trace.analysis.usedLLM ? 'Yes' : 'No (cached)'}
                </span>
              </div>
            </div>
          ) : (
            <div className="eval-step-pending">
              <p>Frame has not been analyzed yet</p>
            </div>
          )}
        </PipelineStep>

        {/* Step 2: Concentration Gate */}
        <PipelineStep
          title="Step 2: Concentration Gate"
          isExpanded={expandedSections.has('gate')}
          onToggle={() => toggleSection('gate')}
          status={trace.gateResult ? 'complete' : 'pending'}
        >
          {trace.gateResult ? (
            <div className="eval-step-content">
              <div className="eval-field eval-field-inline">
                <label>Decision</label>
                <span
                  className={`eval-decision ${trace.gateResult.decision === 'CONTINUE' ? 'success' : 'warning'}`}
                >
                  {trace.gateResult.decision}
                  {trace.gateResult.decision === 'CONTINUE' ? ' ✓' : ' ✗'}
                </span>
              </div>
              <div className="eval-field eval-field-inline">
                <label>Importance</label>
                <div className="eval-score-bar">
                  <div
                    className="eval-score-fill"
                    style={{ width: `${trace.gateResult.importance * 100}%` }}
                  />
                  <span className="eval-score-value">
                    {(trace.gateResult.importance * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
              <div className="eval-field">
                <label>Reason</label>
                <p>{trace.gateResult.reason}</p>
              </div>
            </div>
          ) : (
            <div className="eval-step-pending">
              <p>Frame has not passed through concentration gate</p>
            </div>
          )}
        </PipelineStep>

        {/* Contributed Suggestions - Full Details */}
        {trace.suggestions.length > 0 ? (
          trace.suggestions.map((suggestion, index) => (
            <PipelineStep
              key={suggestion.suggestionId}
              title={`Suggestion ${index + 1}: ${suggestion.title}`}
              isExpanded={expandedSections.has(`suggestion-${index}`)}
              onToggle={() => toggleSection(`suggestion-${index}`)}
              status={suggestion.status === 'active' ? 'complete' : 'info'}
              badge={suggestion.status}
            >
              <div className="eval-step-content">
                {/* Basic Info */}
                <div className="eval-field">
                  <label>ID</label>
                  <p className="eval-batch-id">{suggestion.suggestionId}</p>
                </div>
                <div className="eval-field">
                  <label>
                    Description
                    <button className="eval-description-toggle" onClick={() => toggleField(`sug-${index}-desc`)}>
                      {expandedFields.has(`sug-${index}-desc`) ? 'Collapse' : 'Expand'}
                    </button>
                  </label>
                  <p className={`eval-description ${expandedFields.has(`sug-${index}-desc`) ? 'expanded' : ''}`}>
                    {suggestion.description}
                  </p>
                </div>
                <div className="eval-field">
                  <label>
                    Approach
                    <button className="eval-description-toggle" onClick={() => toggleField(`sug-${index}-approach`)}>
                      {expandedFields.has(`sug-${index}-approach`) ? 'Collapse' : 'Expand'}
                    </button>
                  </label>
                  <p className={`eval-description ${expandedFields.has(`sug-${index}-approach`) ? 'expanded' : ''}`}>
                    {suggestion.approach}
                  </p>
                </div>
                <div className="eval-field">
                  <label>Keywords</label>
                  <div className="eval-tags">
                    {suggestion.keywords.slice(0, 10).map((kw, i) => (
                      <span key={i} className="eval-tag eval-tag-keyword">{kw}</span>
                    ))}
                    {suggestion.keywords.length > 10 && (
                      <span className="eval-tag eval-tag-more">+{suggestion.keywords.length - 10} more</span>
                    )}
                  </div>
                </div>
                <div className="eval-field eval-field-inline">
                  <label>Raw Support</label>
                  <span className="eval-raw-support">{suggestion.rawSupport}/10</span>
                </div>

                {/* Scoring */}
                {suggestion.scores && (
                  <>
                    <div className="eval-section-divider">Scoring</div>
                    <div className="eval-scores">
                      <div className="eval-score-row">
                        <span className="eval-score-label">Benefit</span>
                        <div className="eval-score-bar">
                          <div
                            className="eval-score-fill eval-score-benefit"
                            style={{ width: `${suggestion.scores.benefit * 100}%` }}
                          />
                          <span className="eval-score-value">{(suggestion.scores.benefit * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                      <div className="eval-score-row">
                        <span className="eval-score-label">Disruption</span>
                        <div className="eval-score-bar">
                          <div
                            className="eval-score-fill eval-score-disruption"
                            style={{ width: `${suggestion.scores.disruptionCost * 100}%` }}
                          />
                          <span className="eval-score-value">{(suggestion.scores.disruptionCost * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                      <div className="eval-score-row">
                        <span className="eval-score-label">Miss Cost</span>
                        <div className="eval-score-bar">
                          <div
                            className="eval-score-fill eval-score-miss"
                            style={{ width: `${suggestion.scores.missCost * 100}%` }}
                          />
                          <span className="eval-score-value">{(suggestion.scores.missCost * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                      <div className="eval-score-row">
                        <span className="eval-score-label">Decay</span>
                        <div className="eval-score-bar">
                          <div
                            className="eval-score-fill eval-score-decay"
                            style={{ width: `${suggestion.scores.decay * 100}%` }}
                          />
                          <span className="eval-score-value">{(suggestion.scores.decay * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                      <div className="eval-score-row">
                        <span className="eval-score-label">Combined</span>
                        <div className="eval-score-bar">
                          <div
                            className="eval-score-fill eval-score-combined"
                            style={{ width: `${suggestion.scores.combined * 100}%` }}
                          />
                          <span className="eval-score-value">{(suggestion.scores.combined * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    </div>
                    {suggestion.filterDecision && (
                      <div className="eval-field eval-field-inline">
                        <label>Filter Decision</label>
                        <span className={`eval-decision ${suggestion.filterDecision.passed ? 'success' : 'warning'}`}>
                          {suggestion.filterDecision.passed ? 'PASSED' : 'FILTERED'} - {suggestion.filterDecision.reason}
                        </span>
                      </div>
                    )}
                  </>
                )}

                {/* Deduplication */}
                {suggestion.deduplication && (
                  <>
                    <div className="eval-section-divider">Deduplication</div>
                    <div className="eval-field eval-field-inline">
                      <label>Status</label>
                      <span className={`eval-decision ${suggestion.deduplication.isUnique ? 'success' : 'warning'}`}>
                        {suggestion.deduplication.isUnique ? 'UNIQUE' : 'DUPLICATE'}
                      </span>
                    </div>
                    {suggestion.deduplication.similarities.length > 0 && (
                      <div className="eval-field">
                        <label>Similarities</label>
                        <div className="eval-similarities">
                          {suggestion.deduplication.similarities.slice(0, 3).map((sim, i) => (
                            <div key={i} className="eval-similarity-item">
                              <div className="eval-similarity-header">
                                <span className="eval-similarity-pair">
                                  vs {sim.suggestion1Id === suggestion.suggestionId ? sim.suggestion2Id : sim.suggestion1Id}
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
                  </>
                )}

                {/* Link to full suggestion view */}
                <button
                  className="eval-suggestion-link"
                  onClick={() => onSuggestionClick(suggestion.suggestionId)}
                >
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
                  </svg>
                  <span>View in Suggestions tab</span>
                </button>
              </div>
            </PipelineStep>
          ))
        ) : (
          <PipelineStep
            title="Contributed to Suggestions"
            isExpanded={expandedSections.has('suggestions')}
            onToggle={() => toggleSection('suggestions')}
            status="info"
          >
            <div className="eval-step-pending">
              <p>This frame has not contributed to any suggestions yet</p>
            </div>
          </PipelineStep>
        )}
      </div>
    </div>
  )
}
