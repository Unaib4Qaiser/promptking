
import { useState } from 'react'
import SearchBar from '../components/SearchBar'
import NotesGrid from '../components/Kanban'
import NoteEditor from '../components/NoteEditor'
import AddNoteModal from '../components/AddNoteModal'
import AuthModal from '../components/AuthModal'
import { useNotes } from '../hooks/useNotes'
import { useAuth } from '../hooks/useAuth'
import type { Note } from '../types'

export default function App() {
  const [query, setQuery] = useState('')
  const { notes, addNote, updateNote, removeNote, syncing, syncError } = useNotes(query)
  const { user, loading, signOut } = useAuth()
  const [editing, setEditing] = useState<Note | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)

  function handleAddNote(title: string, content: string) {
    void addNote({ title, content })
  }

  async function handleSignOut() {
    await signOut()
  }

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh">
      <header className="header px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold">My Notes</h1>
          {syncing && (
            <div className="flex items-center gap-1 text-sm text-blue-600">
              <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span>Syncing...</span>
            </div>
          )}
          {syncError && (
            <div className="text-sm text-red-600 flex items-center gap-1" title={syncError}>
              <span className="w-2 h-2 bg-red-600 rounded-full"></span>
              Sync Error
            </div>
          )}
          {!navigator.onLine && (
            <div className="text-sm text-orange-600 flex items-center gap-1">
              <span className="w-2 h-2 bg-orange-600 rounded-full"></span>
              Offline
            </div>
          )}
          {user && navigator.onLine && !syncing && !syncError && (
            <div className="text-sm text-green-600 flex items-center gap-1">
              <span className="w-2 h-2 bg-green-600 rounded-full"></span>
              Online
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {user ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">{user.email}</span>
              <button
                onClick={handleSignOut}
                className="text-sm text-blue-600 hover:underline"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => setShowAuthModal(true)}
                className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
              >
                Sign In
              </button>
              {(!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) && (
                <div className="text-xs text-orange-500">
                  Demo Mode
                </div>
              )}
            </>
          )}
        </div>
      </header>
      
      <SearchBar value={query} onChange={setQuery} />
      <NotesGrid notes={notes} onEdit={setEditing} />
      
      <button 
        className="fab" 
        aria-label="Add note" 
        onClick={() => setShowAddModal(true)}
      >
        +
      </button>
      
      <AddNoteModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleAddNote}
      />
      
      <NoteEditor
        open={!!editing}
        note={editing}
        onClose={() => setEditing(null)}
        onSave={(n) => void updateNote(n)}
        onDelete={(id) => void removeNote(id)}
      />
      
      <AuthModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  )
}
