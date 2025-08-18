
import { Note } from '../types'
import NoteCard from './NoteCard'

export default function NotesGrid({ notes, onEdit }:{ notes: Note[]; onEdit:(n:Note)=>void }) {
  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Your Notes</h2>
        <span className="badge">{notes.length} notes</span>
      </div>
      
      {notes.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-400 mb-2">No notes yet</p>
          <p className="text-sm text-slate-500">Click the + button to create your first note</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {notes.map(note => (
            <NoteCard key={note.id} note={note} onEdit={onEdit} />
          ))}
        </div>
      )}
    </div>
  )
}
