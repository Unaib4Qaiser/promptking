
import Dexie, { type Table } from 'dexie'
import type { Note } from '../types'

export class NotesDB extends Dexie {
  notes!: Table<Note, string>
  constructor() {
    super('notes-db')
    this.version(1).stores({
      notes: 'id, updated_at, title'
    })
  }
}

export const db = new NotesDB()
