import React, { useState } from 'react'
import { Modal } from './Modal'
import type { Suggestion } from '../../types'

interface ThumbsUpModalProps {
  suggestion: Suggestion
  onClose: () => void
  onSubmit: (feedback?: string) => void
}

export function ThumbsUpModal({ onClose, onSubmit }: ThumbsUpModalProps): React.JSX.Element {
  const [feedback, setFeedback] = useState('')

  const handleSubmit = (): void => {
    onSubmit(feedback.trim() || undefined)
  }

  return (
    <Modal title="Positive Feedback" onClose={onClose} size="sm">
      <div className="thumbs-up-icon">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="currentColor">
          <path d="M4 18a2.667 2.667 0 115.333 0v10.667a2.667 2.667 0 11-5.333 0V18zm7.111-.296v9.63a3.556 3.556 0 001.964 3.177l.089.045A7.111 7.111 0 0016.351 32h9.63a3.556 3.556 0 003.484-2.858l2.133-10.666A3.556 3.556 0 0028.107 14H21.333V7.111a3.556 3.556 0 00-3.555-3.555 1.778 1.778 0 00-1.778 1.777v1.186a7.111 7.111 0 01-1.422 4.267l-2.489 3.318a7.111 7.111 0 00-1.422 4.267z" />
        </svg>
      </div>
      <p className="thumbs-up-message">
        Thanks for the feedback! This helps improve future suggestions.
      </p>
      <div className="modal-form-group">
        <label className="feedback-textarea-label">Additional comments (optional)</label>
        <textarea
          className="feedback-textarea"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="What made this suggestion helpful?"
          rows={3}
        />
      </div>
      <div className="modal-footer" style={{ borderTop: 'none', padding: 0, marginTop: '16px' }}>
        <button className="btn btn-secondary" onClick={onClose}>
          Skip
        </button>
        <button className="btn btn-primary" onClick={handleSubmit}>
          Submit
        </button>
      </div>
    </Modal>
  )
}
