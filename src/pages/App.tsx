
import { useState } from 'react'
import SearchBar from '../components/SearchBar'
import NotesGrid from '../components/Kanban'
import NoteEditor from '../components/NoteEditor'
import AddNoteModal from '../components/AddNoteModal'
import { useNotes } from '../hooks/useNotes'
import type { Note } from '../types'

export default function App() {
  const [query, setQuery] = useState('')
  const { notes, addNote, updateNote, removeNote } = useNotes(query)
  const [editing, setEditing] = useState<Note | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)

  function handleAddNote(title: string, content: string) {
    void addNote({ title, content })
  }

  return (
    <div className="min-h-dvh">
      <header className="header px-4 py-3 flex items-center gap-3">
        <h1 className="text-base font-semibold">My Notes</h1>
      </header>
      <SearchBar value={query} onChange={setQuery} />
      <NotesGrid notes={notes} onEdit={setEditing} />
      <button className="fab" aria-label="Add note" onClick={() => setShowAddModal(true)}>+</button>
      <AddNoteModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleAddNote}
      />
      <NoteEditor
        open={!!editing}
        note={editing}
        onClose={()=>setEditing(null)}
        onSave={(n)=>void updateNote(n)}
        onDelete={(id)=>void removeNote(id)}
      />
    </div>
  )
}
