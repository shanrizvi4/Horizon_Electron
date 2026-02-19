/**
 * =============================================================================
 * USE SUGGESTIONS HOOK
 * =============================================================================
 *
 * Custom React hook for working with AI-generated suggestions.
 * Provides CRUD operations, sorting, filtering, and grouping utilities.
 *
 * FEATURES:
 * - Get all suggestions or active only
 * - Update, dismiss, or complete suggestions
 * - Sort by recency or importance
 * - Filter by search query
 * - Group by time period
 *
 * USAGE:
 * ```tsx
 * function SuggestionList() {
 *   const {
 *     activeSuggestions,
 *     dismissSuggestion,
 *     sortSuggestions,
 *     groupSuggestionsByTime
 *   } = useSuggestions()
 *
 *   const sorted = sortSuggestions(activeSuggestions, 'recent')
 *   const grouped = groupSuggestionsByTime(sorted)
 *
 *   return (
 *     <div>
 *       {Array.from(grouped.entries()).map(([timeGroup, suggestions]) => (
 *         <div key={timeGroup}>
 *           <h3>{timeGroup}</h3>
 *           {suggestions.map(s => (
 *             <SuggestionCard
 *               key={s.suggestionId}
 *               suggestion={s}
 *               onDismiss={() => dismissSuggestion(s.suggestionId)}
 *             />
 *           ))}
 *         </div>
 *       ))}
 *     </div>
 *   )
 * }
 * ```
 *
 * @module hooks/useSuggestions
 */

import { useCallback, useMemo } from 'react'
import { useData } from '../context/DataContext'
import type { Suggestion, SortMethod } from '../types'

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Return type of the useSuggestions hook.
 */
interface UseSuggestionsReturn {
  /** All suggestions (including dismissed) */
  suggestions: Suggestion[]

  /** Only active suggestions */
  activeSuggestions: Suggestion[]

  /** Find a suggestion by ID */
  getSuggestion: (id: string) => Suggestion | undefined

  /** Get all suggestions for a specific project */
  getProjectSuggestions: (projectId: number) => Suggestion[]

  /** Update suggestion properties */
  updateSuggestion: (suggestionId: string, updates: Partial<Suggestion>) => void

  /** Dismiss a suggestion (hide from active list) */
  dismissSuggestion: (suggestionId: string) => void

  /** Mark a suggestion as complete */
  completeSuggestion: (suggestionId: string) => void

  /** Sort suggestions by method */
  sortSuggestions: (suggestions: Suggestion[], method: SortMethod) => Suggestion[]

  /** Filter suggestions by search query */
  filterSuggestions: (suggestions: Suggestion[], query: string) => Suggestion[]

  /** Group suggestions by time period */
  groupSuggestionsByTime: (suggestions: Suggestion[]) => Map<string, Suggestion[]>
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

/**
 * Hook for working with AI-generated suggestions.
 *
 * Provides methods to manage suggestions and utilities for
 * sorting, filtering, and grouping.
 *
 * @returns Suggestion management functions and data
 */
export function useSuggestions(): UseSuggestionsReturn {
  const {
    state,
    dispatch,
    getSuggestionById,
    getProjectSuggestions,
    getActiveSuggestions,
    syncToBackend
  } = useData()

  // ---------------------------------------------------------------------------
  // CRUD Operations
  // ---------------------------------------------------------------------------

  /**
   * Updates a suggestion's properties.
   *
   * @param suggestionId - ID of suggestion to update
   * @param updates - Partial suggestion object with fields to update
   */
  const updateSuggestion = useCallback(
    (suggestionId: string, updates: Partial<Suggestion>) => {
      const action = { type: 'UPDATE_SUGGESTION' as const, payload: { suggestionId, updates } }
      dispatch(action)
      syncToBackend(action)
    },
    [dispatch, syncToBackend]
  )

  /**
   * Dismisses a suggestion.
   *
   * Sets the suggestion's status to 'closed', hiding it from
   * the active list. The suggestion is not deleted.
   *
   * @param suggestionId - ID of suggestion to dismiss
   */
  const dismissSuggestion = useCallback(
    (suggestionId: string) => {
      const action = { type: 'DISMISS_SUGGESTION' as const, payload: { suggestionId } }
      dispatch(action)
      syncToBackend(action)
    },
    [dispatch, syncToBackend]
  )

  /**
   * Marks a suggestion as complete.
   *
   * Sets the suggestion's status to 'complete', indicating
   * the user has finished the suggested task.
   *
   * @param suggestionId - ID of suggestion to complete
   */
  const completeSuggestion = useCallback(
    (suggestionId: string) => {
      const action = { type: 'COMPLETE_SUGGESTION' as const, payload: { suggestionId } }
      dispatch(action)
      syncToBackend(action)
    },
    [dispatch, syncToBackend]
  )

  // ---------------------------------------------------------------------------
  // Sorting
  // ---------------------------------------------------------------------------

  /**
   * Sorts suggestions by the specified method.
   *
   * Methods:
   * - 'recent': Most recently updated first
   * - 'importance': Highest composite score first (importance + confidence + timeliness + actionability)
   *
   * @param suggestions - Array of suggestions to sort
   * @param method - Sort method ('recent' or 'importance')
   * @returns New sorted array (original unchanged)
   */
  const sortSuggestions = useCallback((suggestions: Suggestion[], method: SortMethod) => {
    const sorted = [...suggestions]

    if (method === 'recent') {
      // Sort by most recently updated/created
      sorted.sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0))
    } else {
      // Sort by composite score (0.3*importance + 0.4*confidence + 0.2*timeliness + 0.1*actionability)
      sorted.sort((a, b) => {
        const scoreA = a.utilities.compositeScore || 0
        const scoreB = b.utilities.compositeScore || 0
        return scoreB - scoreA
      })
    }

    return sorted
  }, [])

  // ---------------------------------------------------------------------------
  // Filtering
  // ---------------------------------------------------------------------------

  /**
   * Filters suggestions by search query.
   *
   * Searches in:
   * - Title
   * - Description
   * - Keywords
   *
   * @param suggestions - Array of suggestions to filter
   * @param query - Search query (case-insensitive)
   * @returns Filtered array matching the query
   */
  const filterSuggestions = useCallback((suggestions: Suggestion[], query: string) => {
    if (!query.trim()) return suggestions

    const lowerQuery = query.toLowerCase()
    return suggestions.filter(
      (s) =>
        s.title.toLowerCase().includes(lowerQuery) ||
        s.description.toLowerCase().includes(lowerQuery) ||
        s.keywords.some((k) => k.toLowerCase().includes(lowerQuery))
    )
  }, [])

  // ---------------------------------------------------------------------------
  // Grouping
  // ---------------------------------------------------------------------------

  /**
   * Groups suggestions by time period.
   *
   * Time groups:
   * - "Now" (< 1 hour)
   * - "Last Hour" (1-2 hours)
   * - "Today" (2-24 hours)
   * - "Yesterday" (1-2 days)
   * - "This Week" (2-7 days)
   * - "Earlier" (> 7 days)
   *
   * @param suggestions - Array of suggestions to group
   * @returns Map of time group name → suggestions array
   */
  const groupSuggestionsByTime = useCallback((suggestions: Suggestion[]) => {
    const now = Date.now()
    const hour = 60 * 60 * 1000
    const day = 24 * hour

    const groups = new Map<string, Suggestion[]>()

    suggestions.forEach((suggestion) => {
      const time = suggestion.updatedAt || suggestion.createdAt || 0
      const diff = now - time

      let group: string
      if (diff < hour) {
        group = 'Now'
      } else if (diff < 2 * hour) {
        group = 'Last Hour'
      } else if (diff < day) {
        group = 'Today'
      } else if (diff < 2 * day) {
        group = 'Yesterday'
      } else if (diff < 7 * day) {
        group = 'This Week'
      } else {
        group = 'Earlier'
      }

      const existing = groups.get(group) || []
      groups.set(group, [...existing, suggestion])
    })

    return groups
  }, [])

  // ---------------------------------------------------------------------------
  // Memoized Values
  // ---------------------------------------------------------------------------

  /**
   * Active suggestions (memoized to prevent unnecessary re-renders).
   */
  const activeSuggestions = useMemo(
    () => getActiveSuggestions(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.suggestions]
  )

  // ---------------------------------------------------------------------------
  // Return Value
  // ---------------------------------------------------------------------------

  return {
    suggestions: state.suggestions,
    activeSuggestions,
    getSuggestion: getSuggestionById,
    getProjectSuggestions,
    updateSuggestion,
    dismissSuggestion,
    completeSuggestion,
    sortSuggestions,
    filterSuggestions,
    groupSuggestionsByTime
  }
}
