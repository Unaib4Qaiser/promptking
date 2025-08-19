import { FormEvent, useState } from 'react'

interface AddNoteModalProps {
  open: boolean
  onClose: () => void
  onSave: (title: string, content: string) => void
}

export default function AddNoteModal({ open, onClose, onSave }: AddNoteModalProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  if (!open) return null

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (title.trim()) {
      onSave(title.trim(), content.trim())
      setTitle('')
      setContent('')
      onClose()
    }
  }

  const handleClose = () => {
    setTitle('')
    setContent('')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="card w-full max-w-md p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Add New Note</h2>
          <button 
            onClick={handleClose}
            className="text-slate-400 hover:text-white text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="note-title" className="block text-sm font-medium mb-1">
              Title
            </label>
            <input
              id="note-title"
              type="text"
              className="input w-full"
              placeholder="Enter note title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              required
            />
          </div>
          
          <div>
            <label htmlFor="note-content" className="block text-sm font-medium mb-1">
              Description
            </label>
            <textarea
              id="note-content"
              className="input w-full min-h-[100px] resize-none"
              placeholder="Enter note description..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
            />
          </div>
          
          <div className="flex gap-2 justify-end">
            <button 
              type="button" 
              onClick={handleClose}
              className="btn"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="btn btn-primary"
              disabled={!title.trim()}
            >
              Add Note
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
