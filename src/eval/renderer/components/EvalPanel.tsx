import React, { useState, useEffect, useMemo } from 'react'
import { FrameList } from './FrameList'
import { EvalSuggestionList } from './EvalSuggestionList'
import { SearchBar } from '../../../renderer/src/components/common/SearchBar'

interface FrameSummary {
  frameId: string
  timestamp: number
  type: 'periodic' | 'before' | 'after'
  hasAnalysis: boolean
  gateDecision?: 'CONTINUE' | 'SKIP'
  contributedToSuggestions: number
}

interface SuggestionSummary {
  suggestionId: string
  title: string
  status: string
  support: number
  createdAt: number
  sourceFrameCount: number
}

interface EvalPanelProps {
  viewMode: 'frames' | 'suggestions'
  selectedFrameId: string | null
  selectedSuggestionId: string | null
  searchQuery: string
  onFrameSelect: (frameId: string) => void
  onSuggestionSelect: (suggestionId: string) => void
  onSearch: (query: string) => void
  isCollapsed: boolean
  onToggleCollapse: () => void
}

export function EvalPanel({
  viewMode,
  selectedFrameId,
  selectedSuggestionId,
  searchQuery,
  onFrameSelect,
  onSuggestionSelect,
  onSearch,
  isCollapsed,
  onToggleCollapse
}: EvalPanelProps): React.JSX.Element {
  const [frames, setFrames] = useState<FrameSummary[]>([])
  const [suggestions, setSuggestions] = useState<SuggestionSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Load data based on view mode
  useEffect(() => {
    const loadData = async (): Promise<void> => {
      setIsLoading(true)
      try {
        if (viewMode === 'frames') {
          const data = await window.api.evaluation.listFrames()
          setFrames(data)
        } else {
          const data = await window.api.evaluation.listSuggestions()
          setSuggestions(data)
        }
      } catch (error) {
        console.error('Failed to load evaluation data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [viewMode])

  // Filter data based on search query
  const filteredFrames = useMemo(() => {
    if (!searchQuery.trim()) return frames
    const query = searchQuery.toLowerCase()
    return frames.filter((frame) => frame.frameId.toLowerCase().includes(query))
  }, [frames, searchQuery])

  const filteredSuggestions = useMemo(() => {
    if (!searchQuery.trim()) return suggestions
    const query = searchQuery.toLowerCase()
    return suggestions.filter(
      (s) =>
        s.suggestionId.toLowerCase().includes(query) || s.title.toLowerCase().includes(query)
    )
  }, [suggestions, searchQuery])

  // Collapsed view - just show expand button
  if (isCollapsed) {
    return (
      <button
        className="eval-panel-toggle eval-panel-toggle-collapsed"
        onClick={onToggleCollapse}
        title="Expand panel"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
    )
  }

  return (
    <div className="eval-panel">
      <div className="eval-panel-header">
        <div className="eval-panel-header-row">
          <button
            className="eval-panel-toggle"
            onClick={onToggleCollapse}
            title="Collapse panel"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <SearchBar
            value={searchQuery}
            onChange={onSearch}
            placeholder={`Search ${viewMode === 'frames' ? 'frames' : 'suggestions'}...`}
          />
        </div>
        <div className="eval-panel-count">
          {isLoading ? (
            <span className="eval-loading">Loading...</span>
          ) : viewMode === 'frames' ? (
            <span>{filteredFrames.length} frames</span>
          ) : (
            <span>{filteredSuggestions.length} suggestions</span>
          )}
        </div>
      </div>
      <div className="eval-panel-list">
        {isLoading ? (
          <div className="eval-loading-spinner">
            <div className="spinner" />
          </div>
        ) : viewMode === 'frames' ? (
          <FrameList
            frames={filteredFrames}
            selectedFrameId={selectedFrameId}
            onFrameSelect={onFrameSelect}
          />
        ) : (
          <EvalSuggestionList
            suggestions={filteredSuggestions}
            selectedSuggestionId={selectedSuggestionId}
            onSuggestionSelect={onSuggestionSelect}
          />
        )}
      </div>
    </div>
  )
}
