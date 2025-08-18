
import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/db'
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
  
  // subscribe to local DB
  useEffect(() => {
    return subscribe(async () => (await db.notes.orderBy('updated_at').reverse().toArray()), setNotes)
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
      updated_at: now,
      user_id: null,
    }
    await db.notes.put(note)
  }

  async function updateNote(note: Note) {
    const now = new Date().toISOString()
    const updated = { ...note, updated_at: now }
    await db.notes.put(updated)
  }

  async function removeNote(id: string) {
    await db.notes.delete(id)
  }

  return { notes: filtered, addNote, updateNote, removeNote }
}
