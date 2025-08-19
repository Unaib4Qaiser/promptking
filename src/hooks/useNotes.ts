
import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/db'
import { syncService } from '../lib/syncService'
import { liveQuery } from 'dexie'
import type { Note } from '../types'

function subscribe<T>(query: () => Promise<T>, cb: (value: T) => void) {
  const sub = liveQuery(query).subscribe({
    next: cb,
    error: console.error
  })
  return () => sub.unsubscribe()
}

export function useNotes(search: string) {
  const [notes, setNotes] = useState<Note[]>([])
  const [syncing, setSyncing] = useState(false)
  
  // subscribe to local DB
  useEffect(() => {
    return subscribe(async () => (await db.notes.orderBy('updated_at').reverse().toArray()), setNotes)
  }, [])

  // Listen for sync events
  useEffect(() => {
    const unsubscribe = syncService.onSyncComplete(() => {
      setSyncing(false)
    })
    return unsubscribe
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return notes
    return notes.filter(n => n.title.toLowerCase().includes(q))
  }, [notes, search])

  async function addNote(partial?: Partial<Note>) {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const note: Note = {
      id,
      title: partial?.title ?? 'Untitled',
      content: partial?.content ?? '',
      status: partial?.status ?? 'todo',
      updated_at: now,
      user_id: null,
      synced: false,
    }
    
    // Save to local DB
    await db.notes.put(note)
    
    // Queue for sync
    await syncService.queueOperation({
      operation: 'create',
      table: 'notes',
      record_id: id,
      data: note
    })
    
    setSyncing(true)
  }

  async function updateNote(note: Note) {
    const now = new Date().toISOString()
    const updated = { 
      ...note, 
      updated_at: now,
      synced: false
    }
    
    // Save to local DB
    await db.notes.put(updated)
    
    // Queue for sync
    await syncService.queueOperation({
      operation: 'update',
      table: 'notes',
      record_id: note.id,
      data: updated
    })
    
    setSyncing(true)
  }

  async function removeNote(id: string) {
    // Remove from local DB
    await db.notes.delete(id)
    
    // Queue for sync
    await syncService.queueOperation({
      operation: 'delete',
      table: 'notes',
      record_id: id
    })
    
    setSyncing(true)
  }

  return { 
    notes: filtered, 
    addNote, 
    updateNote, 
    removeNote,
    syncing
  }
}
