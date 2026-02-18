import React, { useState, useEffect, useCallback } from 'react'
import { EvalPanel } from './components/EvalPanel'
import { FrameDetail } from './components/FrameDetail'
import { SuggestionDetail } from './components/SuggestionDetail'
import './styles/evaluation.css'

type ViewMode = 'frames' | 'suggestions'

export function EvaluationPage(): React.JSX.Element {
  const [viewMode, setViewMode] = useState<ViewMode>('frames')
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null)
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false)

  const handleTogglePanel = useCallback(() => {
    setIsPanelCollapsed((prev) => !prev)
  }, [])

  const handleFrameSelect = useCallback((frameId: string) => {
    setSelectedFrameId(frameId)
  }, [])

  const handleSuggestionSelect = useCallback((suggestionId: string) => {
    setSelectedSuggestionId(suggestionId)
  }, [])

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
  }, [])

  return (
    <div className="content-area">
      <div className="content-header">
        <div className="content-header-left">
          <h1 className="page-title">Pipeline Evaluation</h1>
        </div>
        <div className="content-header-right">
          <div className="eval-view-toggle">
            <button
              className={`eval-view-btn ${viewMode === 'frames' ? 'active' : ''}`}
              onClick={() => {
                setViewMode('frames')
                setSelectedSuggestionId(null)
              }}
            >
              Frames
            </button>
            <button
              className={`eval-view-btn ${viewMode === 'suggestions' ? 'active' : ''}`}
              onClick={() => {
                setViewMode('suggestions')
                setSelectedFrameId(null)
              }}
            >
              Suggestions
            </button>
          </div>
        </div>
      </div>
      <div className="content-body">
        <div className={`eval-container ${isPanelCollapsed ? 'panel-collapsed' : ''}`}>
          <EvalPanel
            viewMode={viewMode}
            selectedFrameId={selectedFrameId}
            selectedSuggestionId={selectedSuggestionId}
            searchQuery={searchQuery}
            onFrameSelect={handleFrameSelect}
            onSuggestionSelect={handleSuggestionSelect}
            onSearch={handleSearch}
            isCollapsed={isPanelCollapsed}
            onToggleCollapse={handleTogglePanel}
          />
          <div className="eval-detail-panel">
            {viewMode === 'frames' && selectedFrameId && (
              <FrameDetail
                frameId={selectedFrameId}
                onSuggestionClick={(suggestionId) => {
                  setViewMode('suggestions')
                  setSelectedSuggestionId(suggestionId)
                }}
              />
            )}
            {viewMode === 'suggestions' && selectedSuggestionId && (
              <SuggestionDetail
                suggestionId={selectedSuggestionId}
                onFrameClick={(frameId) => {
                  setViewMode('frames')
                  setSelectedFrameId(frameId)
                }}
              />
            )}
            {!selectedFrameId && !selectedSuggestionId && (
              <div className="eval-empty-state">
                <div className="eval-empty-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                    <path
                      fillRule="evenodd"
                      d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <h3>Select an item to view details</h3>
                <p>
                  Choose a {viewMode === 'frames' ? 'frame' : 'suggestion'} from the list to see
                  its full pipeline trace.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
