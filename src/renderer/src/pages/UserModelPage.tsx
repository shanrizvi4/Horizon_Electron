import React, { useState } from 'react'
import { useData } from '../context/DataContext'

export function UserModelPage(): React.JSX.Element {
  const { state, dispatch } = useData()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [newProposition, setNewProposition] = useState('')
  const [isAdding, setIsAdding] = useState(false)

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
    if (newProposition.trim()) {
      dispatch({
        type: 'ADD_PROPOSITION',
        payload: {
          id: `prop-${Date.now()}`,
          text: newProposition.trim(),
          editHistory: []
        }
      })
      setNewProposition('')
      setIsAdding(false)
    }
  }

  return (
    <div className="content-area">
      <div className="content-header">
        <div className="content-header-left">
          <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 600 }}>Memory</h1>
        </div>
      </div>
      <div className="content-body">
        <div className="page">
          <div className="page-header">
            <p className="page-subtitle">
              Things learned about you over time. Edit or remove to refine.
            </p>
          </div>

          <div className="user-model-list">
            {state.userPropositions.map((proposition) => (
              <div key={proposition.id} className="user-proposition-card">
                <div className="user-proposition-content">
                  {editingId === proposition.id ? (
                    <input
                      type="text"
                      className="user-proposition-text editing"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit()
                        if (e.key === 'Escape') handleCancelEdit()
                      }}
                      autoFocus
                    />
                  ) : (
                    <>
                      <p className="user-proposition-text">{proposition.text}</p>
                      {proposition.editHistory.length > 0 && (
                        <p className="user-proposition-history">
                          Previously: {proposition.editHistory[proposition.editHistory.length - 1]}
                        </p>
                      )}
                    </>
                  )}
                </div>
                <div className="user-proposition-actions">
                  {editingId === proposition.id ? (
                    <>
                      <button className="btn btn-sm btn-primary" onClick={handleSaveEdit}>
                        Save
                      </button>
                      <button className="btn btn-sm btn-ghost" onClick={handleCancelEdit}>
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => handleStartEdit(proposition.id, proposition.text)}
                        title="Edit"
                      >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                          <path d="M10.013 1.427a1.75 1.75 0 012.474 0l.086.086a1.75 1.75 0 010 2.474l-7.61 7.61a1.75 1.75 0 01-.756.445l-2.751.786a.75.75 0 01-.927-.928l.786-2.75a1.75 1.75 0 01.445-.757l7.61-7.61z" />
                        </svg>
                      </button>
                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => handleDelete(proposition.id)}
                        title="Delete"
                      >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                          <path d="M4.293 4.293a1 1 0 011.414 0L7 5.586l1.293-1.293a1 1 0 111.414 1.414L8.414 7l1.293 1.293a1 1 0 01-1.414 1.414L7 8.414l-1.293 1.293a1 1 0 01-1.414-1.414L5.586 7 4.293 5.707a1 1 0 010-1.414z" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}

            {isAdding ? (
              <div className="user-proposition-card">
                <div className="user-proposition-content" style={{ width: '100%' }}>
                  <input
                    type="text"
                    className="user-proposition-text editing"
                    value={newProposition}
                    onChange={(e) => setNewProposition(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAdd()
                      if (e.key === 'Escape') {
                        setIsAdding(false)
                        setNewProposition('')
                      }
                    }}
                    placeholder="Enter a new memory..."
                    autoFocus
                  />
                </div>
                <div className="user-proposition-actions" style={{ opacity: 1 }}>
                  <button className="btn btn-sm btn-primary" onClick={handleAdd}>
                    Add
                  </button>
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => {
                      setIsAdding(false)
                      setNewProposition('')
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button className="add-proposition-btn" onClick={() => setIsAdding(true)}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 2a1 1 0 011 1v4h4a1 1 0 110 2H9v4a1 1 0 11-2 0V9H3a1 1 0 110-2h4V3a1 1 0 011-1z" />
                </svg>
                Add new memory
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
