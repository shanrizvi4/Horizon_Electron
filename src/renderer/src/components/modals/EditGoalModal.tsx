import React, { useState } from 'react'
import { Modal } from './Modal'

interface EditGoalModalProps {
  currentGoal: string
  onClose: () => void
  onSave: (newGoal: string) => void
}

export function EditGoalModal({
  currentGoal,
  onClose,
  onSave
}: EditGoalModalProps): React.JSX.Element {
  const [goal, setGoal] = useState(currentGoal)

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    if (goal.trim()) {
      onSave(goal.trim())
    }
  }

  return (
    <Modal title="Edit Goal" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="modal-form-group">
          <label className="modal-form-label" htmlFor="goal">
            Project Goal
          </label>
          <textarea
            id="goal"
            className="modal-form-textarea"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            autoFocus
            rows={4}
          />
        </div>
        <div className="modal-footer" style={{ borderTop: 'none', padding: 0, marginTop: '16px' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={!goal.trim()}>
            Save
          </button>
        </div>
      </form>
    </Modal>
  )
}
