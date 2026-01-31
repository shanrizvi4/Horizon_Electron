import React, { useState, useMemo } from 'react'
import { useData } from '../context/DataContext'

export function UserModelPage(): React.JSX.Element {
  const { state, dispatch } = useData()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [newMemory, setNewMemory] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const memories = state.userPropositions

  const filteredMemories = useMemo(() => {
    if (!searchQuery.trim()) return memories
    const query = searchQuery.toLowerCase()
    return memories.filter(m => m.text.toLowerCase().includes(query))
  }, [memories, searchQuery])

  const handleStartEdit = (id: string, text: string): void => {
    setEditingId(id)
    setEditValue(text)
  }

  const handleSaveEdit = (): void => {
    if (editingId && editValue.trim()) {
      dispatch({
        type: 'UPDATE_PROPOSITION',
        payload: { id: editingId, text: editValue.trim() }
      })
    }
    setEditingId(null)
    setEditValue('')
  }

  const handleCancelEdit = (): void => {
    setEditingId(null)
    setEditValue('')
  }

  const handleDelete = (id: string): void => {
    dispatch({ type: 'DELETE_PROPOSITION', payload: { id } })
  }

  const handleAdd = (): void => {
    if (newMemory.trim()) {
      dispatch({
        type: 'ADD_PROPOSITION',
        payload: {
          id: `prop-${Date.now()}`,
          text: newMemory.trim(),
          editHistory: []
        }
      })
      setNewMemory('')
      setIsAdding(false)
    }
  }

  return (
    <div className="content-area">
      <div className="content-header">
        <div className="content-header-left">
          <h1 className="page-title">Memory</h1>
        </div>
      </div>
      <div className="content-body">
        <div className="page page-wide">

          {/* Controls */}
          {memories.length > 0 && (
            <div className="memory-controls">
              <div className="memory-search">
                <svg className="memory-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="M21 21l-4.35-4.35"/>
                </svg>
                <input
                  type="text"
                  className="memory-search-input"
                  placeholder="Search memories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    className="memory-search-clear"
                    onClick={() => setSearchQuery('')}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                  </button>
                )}
              </div>
              <button
                className="memory-add-btn"
                onClick={() => setIsAdding(true)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
                Add
              </button>
            </div>
          )}

          {/* Add input */}
          {isAdding && (
            <div className="memory-add-row">
              <input
                type="text"
                className="memory-add-input"
                value={newMemory}
                onChange={(e) => setNewMemory(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAdd()
                  if (e.key === 'Escape') {
                    setIsAdding(false)
                    setNewMemory('')
                  }
                }}
                placeholder="What should I remember?"
                autoFocus
              />
              <button className="memory-inline-save" onClick={handleAdd}>Save</button>
              <button
                className="memory-inline-cancel"
                onClick={() => {
                  setIsAdding(false)
                  setNewMemory('')
                }}
              >
                Cancel
              </button>
            </div>
          )}

          {/* Empty state */}
          {memories.length === 0 && !isAdding && (
            <div className="memory-empty">
              <p className="memory-empty-text">
                As we interact, I'll learn things about your preferences and goals.
              </p>
              <button
                className="memory-empty-btn"
                onClick={() => setIsAdding(true)}
              >
                Add something manually
              </button>
            </div>
          )}

          {/* Search results info */}
          {searchQuery && (
            <p className="memory-search-results">
              {filteredMemories.length === 0
                ? 'No matches found'
                : `Showing ${filteredMemories.length} of ${memories.length}`
              }
            </p>
          )}

          {/* Memory list */}
          {filteredMemories.length > 0 && (
            <div className="memory-list">
              {filteredMemories.map((memory) => (
                <div
                  key={memory.id}
                  className={`memory-row ${editingId === memory.id ? 'editing' : ''}`}
                >
                  {editingId === memory.id ? (
                    <div className="memory-row-edit">
                      <input
                        type="text"
                        className="memory-edit-input"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit()
                          if (e.key === 'Escape') handleCancelEdit()
                        }}
                        autoFocus
                      />
                      <button className="memory-inline-save" onClick={handleSaveEdit}>Save</button>
                      <button className="memory-inline-cancel" onClick={handleCancelEdit}>Cancel</button>
                    </div>
                  ) : (
                    <>
                      <p className="memory-row-text">{memory.text}</p>
                      <div className="memory-row-actions">
                        <button
                          className="memory-row-btn"
                          onClick={() => handleStartEdit(memory.id, memory.text)}
                          title="Edit"
                        >
                          Edit
                        </button>
                        <button
                          className="memory-row-btn delete"
                          onClick={() => handleDelete(memory.id)}
                          title="Delete"
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
