import { supabase } from './supabase'
import { db } from './db'
import type { Note, OutboxOperation } from '../types'

export class SyncService {
  private isOnline = navigator.onLine
  private isSyncing = false
  private syncCallbacks: Set<() => void> = new Set()

  constructor() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true
      this.triggerSync()
    })
    
    window.addEventListener('offline', () => {
      this.isOnline = false
    })

    // Start periodic sync when online
    setInterval(() => {
      if (this.isOnline && !this.isSyncing) {
        this.triggerSync()
      }
    }, 30000) // Sync every 30 seconds when online
  }

  onSyncComplete(callback: () => void): () => void {
    this.syncCallbacks.add(callback)
    return () => {
      this.syncCallbacks.delete(callback)
    }
  }

  private notifySyncComplete() {
    this.syncCallbacks.forEach(callback => callback())
  }

  async triggerSync() {
    if (!this.isOnline || this.isSyncing) return
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return // Only sync when authenticated

    this.isSyncing = true
    try {
      // First pull remote changes
      await this.pullFromRemote()
      
      // Then push local changes
      await this.pushToRemote()
      
      this.notifySyncComplete()
    } catch (error) {
      console.error('Sync failed:', error)
    } finally {
      this.isSyncing = false
    }
  }

  private async pullFromRemote() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get the last sync timestamp
    const localNotes = await db.notes.toArray()
    const lastSyncTime = localNotes.length > 0 
      ? Math.max(...localNotes.map(n => new Date(n.updated_at).getTime()))
      : 0

    // Fetch remote notes updated after last sync
    const { data: remoteNotes, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id)
      .gt('updated_at', new Date(lastSyncTime).toISOString())

    if (error) {
      console.error('Failed to fetch remote notes:', error)
      return
    }

    if (!remoteNotes?.length) return

    // Merge remote notes with local notes
    for (const remoteNote of remoteNotes) {
      const localNote = await db.notes.get(remoteNote.id)
      
      if (!localNote || new Date(remoteNote.updated_at) > new Date(localNote.updated_at)) {
        // Remote is newer, update local
        await db.notes.put({
          ...remoteNote,
          synced: true
        })
        
        // Remove any pending operations for this note since we got the latest from remote
        await db.outbox.where('record_id').equals(remoteNote.id).delete()
      }
    }
  }

  private async pushToRemote() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get all pending operations from outbox
    const operations = await db.outbox.orderBy('created_at').toArray()
    
    for (const operation of operations) {
      try {
        let success = false
        
        switch (operation.operation) {
          case 'create':
          case 'update':
            if (operation.data) {
              const noteData = {
                ...operation.data,
                user_id: user.id
              }
              delete (noteData as any).synced // Remove local-only field
              
              const { error } = await supabase
                .from('notes')
                .upsert(noteData)
              
              if (!error) {
                // Mark local note as synced
                await db.notes.update(operation.record_id, { synced: true })
                success = true
              }
            }
            break
            
          case 'delete':
            const { error } = await supabase
              .from('notes')
              .delete()
              .eq('id', operation.record_id)
              .eq('user_id', user.id)
            
            success = !error
            break
        }
        
        if (success) {
          // Remove successful operation from outbox
          await db.outbox.delete(operation.id)
        } else {
          // Increment retry count
          await db.outbox.update(operation.id, { 
            retry_count: operation.retry_count + 1 
          })
          
          // Remove operations that have failed too many times
          if (operation.retry_count >= 5) {
            await db.outbox.delete(operation.id)
            console.warn(`Operation ${operation.id} removed after 5 failed attempts`)
          }
        }
      } catch (error) {
        console.error(`Failed to process operation ${operation.id}:`, error)
        
        // Increment retry count on error
        await db.outbox.update(operation.id, { 
          retry_count: operation.retry_count + 1 
        })
      }
    }
  }

  async queueOperation(operation: Omit<OutboxOperation, 'id' | 'created_at' | 'retry_count'>) {
    const outboxItem: OutboxOperation = {
      ...operation,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      retry_count: 0
    }
    
    await db.outbox.add(outboxItem)
    
    // Trigger immediate sync if online
    if (this.isOnline) {
      setTimeout(() => this.triggerSync(), 100)
    }
  }

  async initialSync() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !this.isOnline) return

    try {
      // Pull all notes for the authenticated user
      const { data: remoteNotes, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)

      if (error) {
        console.error('Initial sync failed:', error)
        return
      }

      if (remoteNotes?.length) {
        // Clear local notes and replace with remote
        await db.notes.clear()
        await db.notes.bulkAdd(
          remoteNotes.map((note: any) => ({ ...note, synced: true }))
        )
      }
    } catch (error) {
      console.error('Initial sync error:', error)
    }
  }
}

export const syncService = new SyncService()
