import React, { useState } from 'react'
import { Modal } from './Modal'

interface EditTitleModalProps {
  currentTitle: string
  onClose: () => void
  onSave: (newTitle: string) => void
}

export function EditTitleModal({
  currentTitle,
  onClose,
  onSave
}: EditTitleModalProps): React.JSX.Element {
  const [title, setTitle] = useState(currentTitle)

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    if (title.trim()) {
      onSave(title.trim())
    }
  }

  return (
    <Modal title="Edit Title" onClose={onClose} size="sm">
      <form onSubmit={handleSubmit}>
        <div className="modal-form-group">
          <label className="modal-form-label" htmlFor="title">
            Title
          </label>
          <input
            id="title"
            type="text"
            className="modal-form-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
        </div>
        <div className="modal-footer" style={{ borderTop: 'none', padding: 0, marginTop: '16px' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={!title.trim()}>
            Save
          </button>
        </div>
      </form>
    </Modal>
  )
}
