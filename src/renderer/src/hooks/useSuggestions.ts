import { useCallback, useMemo } from 'react'
import { useData } from '../context/DataContext'
import type { Suggestion, SortMethod } from '../types'

interface UseSuggestionsReturn {
  suggestions: Suggestion[]
  activeSuggestions: Suggestion[]
  getSuggestion: (id: string) => Suggestion | undefined
  getProjectSuggestions: (projectId: number) => Suggestion[]
  updateSuggestion: (suggestionId: string, updates: Partial<Suggestion>) => void
  dismissSuggestion: (suggestionId: string) => void
  completeSuggestion: (suggestionId: string) => void
  sortSuggestions: (suggestions: Suggestion[], method: SortMethod) => Suggestion[]
  filterSuggestions: (suggestions: Suggestion[], query: string) => Suggestion[]
  groupSuggestionsByTime: (suggestions: Suggestion[]) => Map<string, Suggestion[]>
}

export function useSuggestions(): UseSuggestionsReturn {
  const { state, dispatch, getSuggestionById, getProjectSuggestions, getActiveSuggestions, syncToBackend } =
    useData()

  const updateSuggestion = useCallback(
    (suggestionId: string, updates: Partial<Suggestion>) => {
      const action = { type: 'UPDATE_SUGGESTION' as const, payload: { suggestionId, updates } }
      dispatch(action)
      syncToBackend(action)
    },
    [dispatch, syncToBackend]
  )

  const dismissSuggestion = useCallback(
    (suggestionId: string) => {
      const action = { type: 'DISMISS_SUGGESTION' as const, payload: { suggestionId } }
      dispatch(action)
      syncToBackend(action)
    },
    [dispatch, syncToBackend]
  )

  const completeSuggestion = useCallback(
    (suggestionId: string) => {
      const action = { type: 'COMPLETE_SUGGESTION' as const, payload: { suggestionId } }
      dispatch(action)
      syncToBackend(action)
    },
    [dispatch, syncToBackend]
  )

  const sortSuggestions = useCallback((suggestions: Suggestion[], method: SortMethod) => {
    const sorted = [...suggestions]
    if (method === 'recent') {
      sorted.sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0))
    } else {
      // Sort by importance (support * benefit)
      sorted.sort((a, b) => {
        const scoreA = a.support * a.utilities.benefit
        const scoreB = b.support * b.utilities.benefit
        return scoreB - scoreA
      })
    }
    return sorted
  }, [])

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

  const activeSuggestions = useMemo(
    () => getActiveSuggestions(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.suggestions]
  )

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
