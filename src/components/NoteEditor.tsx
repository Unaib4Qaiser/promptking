
import { useEffect, useState } from 'react'
import type { Note } from '../types'

export default function NoteEditor({
  open, note, onClose, onSave, onDelete
}:{ 
  open: boolean; 
  note: Note | null; 
  onClose: ()=>void; 
  onSave: (n:Note)=>void; 
  onDelete: (id:string)=>void;
}) {
  const [state, setState] = useState<Note | null>(note)
  useEffect(()=>setState(note), [note])
  if (!open || !state) return null

  const update = (patch: Partial<Note>) => setState(s => ({...s!, ...patch}))
  const save = () => { onSave(state!) ; onClose() }
  const del = () => { if (confirm('Delete this note?')) { onDelete(state!.id); onClose() } }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4">
      <div className="card w-full max-w-lg">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-semibold">Edit Note</h3>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label htmlFor="edit-title" className="block text-sm font-medium mb-1 text-slate-300">Title</label>
            <input 
              id="edit-title"
              className="input" 
              value={state.title} 
              onChange={e=>update({title:e.target.value})} 
              placeholder="Enter note title..." 
            />
          </div>
          <div>
            <label htmlFor="edit-content" className="block text-sm font-medium mb-1 text-slate-300">Content</label>
            <textarea 
              id="edit-content"
              className="input min-h-[180px] resize-none" 
              value={state.content} 
              onChange={e=>update({content:e.target.value})} 
              placeholder="Enter note content..." 
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button className="btn btn-primary" onClick={save}>Save Changes</button>
            <button className="btn" onClick={del}>Delete</button>
          </div>
        </div>
      </div>
    </div>
  )
}
