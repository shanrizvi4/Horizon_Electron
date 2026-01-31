import React, { useState, useMemo } from 'react'
import type { SortMethod } from '../types'
import { SearchBar } from '../components/common/SearchBar'
import { SortToggle } from '../components/common/SortToggle'
import { SuggestionList } from '../components/suggestions/SuggestionList'
import { useSuggestions } from '../hooks/useSuggestions'

export function SuggestionsPage(): React.JSX.Element {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortMethod, setSortMethod] = useState<SortMethod>('recent')
  const { activeSuggestions, sortSuggestions, filterSuggestions } = useSuggestions()

  const filteredAndSortedSuggestions = useMemo(() => {
    const filtered = filterSuggestions(activeSuggestions, searchQuery)
    return sortSuggestions(filtered, sortMethod)
  }, [activeSuggestions, searchQuery, sortMethod, filterSuggestions, sortSuggestions])

  return (
    <div className="content-area">
      <div className="content-header">
        <div className="content-header-left">
          <h1 className="page-title">Suggestions</h1>
        </div>
      </div>
      <div className="content-body">
        <div className="page">
          <div className="controls-row">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search suggestions..."
            />
            <SortToggle value={sortMethod} onChange={setSortMethod} />
          </div>
          <SuggestionList
            suggestions={filteredAndSortedSuggestions}
            sortMethod={sortMethod}
            showProject={true}
            emptyMessage={searchQuery ? 'No matching suggestions' : 'No active suggestions'}
          />
        </div>
      </div>
    </div>
  )
}
