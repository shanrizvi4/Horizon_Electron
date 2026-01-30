import React, { useState } from 'react'
import { Modal } from './Modal'
import type { Suggestion } from '../../types'

interface ThumbsDownModalProps {
  suggestion: Suggestion
  onClose: () => void
  onSubmit: (reason: string, feedback?: string) => void
}

const FEEDBACK_OPTIONS = [
  { id: 'irrelevant', label: 'Not relevant to my work' },
  { id: 'wrong_project', label: 'Wrong project context' },
  { id: 'already_done', label: 'Already completed this' },
  { id: 'bad_timing', label: 'Bad timing' }
]

export function ThumbsDownModal({ onClose, onSubmit }: ThumbsDownModalProps): React.JSX.Element {
  const [selectedReason, setSelectedReason] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')

  const handleSubmit = (): void => {
    if (selectedReason) {
      onSubmit(selectedReason, feedback.trim() || undefined)
    }
  }

  return (
    <Modal title="Negative Feedback" onClose={onClose}>
      <p className="modal-description">
        Help us understand why this suggestion wasn&apos;t helpful.
      </p>

      <div className="feedback-options">
        {FEEDBACK_OPTIONS.map((option) => (
          <div
            key={option.id}
            className={`feedback-option ${selectedReason === option.id ? 'selected' : ''}`}
            onClick={() => setSelectedReason(option.id)}
          >
            <div className="feedback-option-radio">
              <div className="feedback-option-radio-inner" />
            </div>
            <span className="feedback-option-text">{option.label}</span>
          </div>
        ))}
      </div>

      <div className="modal-form-group">
        <label className="feedback-textarea-label">Additional comments (optional)</label>
        <textarea
          className="feedback-textarea"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Any other details that would help us improve..."
          rows={3}
        />
      </div>

      <div className="modal-footer" style={{ borderTop: 'none', padding: 0, marginTop: '16px' }}>
        <button className="btn btn-secondary" onClick={onClose}>
          Cancel
        </button>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={!selectedReason}>
          Submit Feedback
        </button>
      </div>
    </Modal>
  )
}
