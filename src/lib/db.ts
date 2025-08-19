
import Dexie, { type Table } from 'dexie'
import type { Note, OutboxOperation } from '../types'

export class NotesDB extends Dexie {
  notes!: Table<Note, string>
  outbox!: Table<OutboxOperation, string>
  
  constructor() {
    super('notes-db')
    this.version(1).stores({
      notes: 'id, updated_at, title, status'
    })
    
    // Version 2: Add outbox for sync operations
    this.version(2).stores({
      notes: 'id, updated_at, title, status',
      outbox: 'id, created_at, operation, table, record_id'
    })
  }
}

export const db = new NotesDB()
