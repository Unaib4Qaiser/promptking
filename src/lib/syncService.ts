import { supabase } from './supabase'
import { db } from './db'
import type { Note, OutboxOperation } from '../types'

export class SyncService {
  private isOnline = navigator.onLine
  private isSyncing = false
  private syncCallbacks: Set<() => void> = new Set()
  private syncErrorCallbacks: Set<(error: string) => void> = new Set()
  private retryTimeout: number | null = null
  private lastSyncAttempt = 0
  private consecutiveFailures = 0

  constructor() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      console.log('Network came online, triggering sync')
      this.isOnline = true
      this.consecutiveFailures = 0
      this.triggerSync()
    })
    
    window.addEventListener('offline', () => {
      console.log('Network went offline')
      this.isOnline = false
      if (this.retryTimeout) {
        clearTimeout(this.retryTimeout)
        this.retryTimeout = null
      }
    })

    // Start periodic sync when online
    setInterval(() => {
      if (this.isOnline && !this.isSyncing) {
        this.triggerSync()
      }
    }, 30000) // Sync every 30 seconds when online

    // Check connectivity periodically to ensure accurate online status
    setInterval(async () => {
      const actuallyOnline = await this.checkConnectivity()
      if (actuallyOnline !== this.isOnline) {
        this.isOnline = actuallyOnline
        if (actuallyOnline) {
          console.log('Connectivity restored, triggering sync')
          this.consecutiveFailures = 0
          this.triggerSync()
        }
      }
    }, 10000) // Check every 10 seconds
  }

  private async checkConnectivity(): Promise<boolean> {
    if (!navigator.onLine) return false
    
    try {
      // Try to fetch a small resource to verify actual connectivity
      const response = await fetch('/favicon.svg', { 
        method: 'HEAD',
        cache: 'no-store',
        signal: AbortSignal.timeout(5000)
      })
      return response.ok
    } catch {
      return false
    }
  }

  onSyncComplete(callback: () => void): () => void {
    this.syncCallbacks.add(callback)
    return () => {
      this.syncCallbacks.delete(callback)
    }
  }

  onSyncError(callback: (error: string) => void): () => void {
    this.syncErrorCallbacks.add(callback)
    return () => {
      this.syncErrorCallbacks.delete(callback)
    }
  }

  private notifySyncComplete() {
    this.syncCallbacks.forEach(callback => callback())
  }

  private notifySyncError(error: string) {
    this.syncErrorCallbacks.forEach(callback => callback(error))
  }

  async triggerSync() {
    if (!this.isOnline || this.isSyncing) return
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return // Only sync when authenticated

    // Implement exponential backoff for retries
    const now = Date.now()
    const timeSinceLastAttempt = now - this.lastSyncAttempt
    const minWaitTime = Math.min(30000, Math.pow(2, this.consecutiveFailures) * 1000) // Max 30 seconds

    if (this.consecutiveFailures > 0 && timeSinceLastAttempt < minWaitTime) {
      console.log(`Waiting ${minWaitTime - timeSinceLastAttempt}ms before next sync attempt`)
      return
    }

    this.lastSyncAttempt = now
    this.isSyncing = true
    
    try {
      console.log('Starting sync...')
      
      // First pull remote changes
      await this.pullFromRemote()
      
      // Then push local changes
      await this.pushToRemote()
      
      console.log('Sync completed successfully')
      this.consecutiveFailures = 0
      this.notifySyncComplete()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown sync error'
      console.error('Sync failed:', error)
      this.consecutiveFailures++
      this.notifySyncError(errorMessage)
      
      // Schedule retry if we haven't failed too many times
      if (this.consecutiveFailures < 5) {
        const retryDelay = Math.min(30000, Math.pow(2, this.consecutiveFailures) * 1000)
        console.log(`Scheduling retry in ${retryDelay}ms`)
        
        if (this.retryTimeout) {
          clearTimeout(this.retryTimeout)
        }
        
        this.retryTimeout = window.setTimeout(() => {
          this.retryTimeout = null
          this.triggerSync()
        }, retryDelay)
      } else {
        console.log('Max sync retries reached, will try again on next periodic sync')
      }
    } finally {
      this.isSyncing = false
    }
  }

  private async pullFromRemote() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    try {
      // Get the last sync timestamp from synced notes only
      const syncedNotes = await db.notes.where('synced').equals(true).toArray()
      const lastSyncTime = syncedNotes.length > 0 
        ? Math.max(...syncedNotes.map(n => new Date(n.updated_at).getTime()))
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
        
        if (!localNote) {
          // New remote note, add it locally
          await db.notes.put({
            ...remoteNote,
            synced: true
          })
        } else if (new Date(remoteNote.updated_at) > new Date(localNote.updated_at)) {
          // Remote is newer, update local only if local is synced or remote is much newer
          const timeDiff = new Date(remoteNote.updated_at).getTime() - new Date(localNote.updated_at).getTime()
          if (localNote.synced || timeDiff > 60000) { // 1 minute threshold for unsynced local changes
            await db.notes.put({
              ...remoteNote,
              synced: true
            })
            
            // Remove any pending operations for this note since we got the latest from remote
            await db.outbox.where('record_id').equals(remoteNote.id).delete()
          }
        }
      }
    } catch (error) {
      console.error('Error during pull from remote:', error)
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
    console.log(`Queued ${operation.operation} operation for ${operation.record_id}`)
    
    // Trigger immediate sync if online and authenticated
    if (this.isOnline) {
      // Small delay to allow UI to update first
      setTimeout(() => this.triggerSync(), 100)
    } else {
      console.log('Offline - operation queued for later sync')
    }
  }

  async initialSync() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.log('No authenticated user, skipping initial sync')
      return
    }

    if (!this.isOnline) {
      console.log('Offline, skipping initial sync')
      return
    }

    console.log('Starting initial sync for user:', user.id)
    
    try {
      // Check if we have any local notes
      const localNotes = await db.notes.toArray()
      const hasLocalNotes = localNotes.length > 0

      // Pull all notes for the authenticated user
      const { data: remoteNotes, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)

      if (error) {
        console.error('Initial sync failed:', error)
        return
      }

      console.log(`Found ${remoteNotes?.length || 0} remote notes, ${localNotes.length} local notes`)

      if (remoteNotes?.length) {
        if (!hasLocalNotes) {
          // No local notes, just load remote notes
          await db.notes.bulkAdd(
            remoteNotes.map((note: any) => ({ ...note, synced: true }))
          )
          console.log('Loaded remote notes into empty local database')
        } else {
          // Merge remote notes with existing local notes
          for (const remoteNote of remoteNotes) {
            const localNote = await db.notes.get(remoteNote.id)
            
            if (!localNote) {
              // New remote note
              await db.notes.put({ ...remoteNote, synced: true })
            } else if (new Date(remoteNote.updated_at) > new Date(localNote.updated_at)) {
              // Remote is newer
              await db.notes.put({ ...remoteNote, synced: true })
              // Remove pending operations for this note
              await db.outbox.where('record_id').equals(remoteNote.id).delete()
            }
          }
          console.log('Merged remote notes with local notes')
        }
      }

      // After initial sync, trigger regular sync to push any local changes
      setTimeout(() => this.triggerSync(), 1000)
      
    } catch (error) {
      console.error('Initial sync error:', error)
    }
  }
}

export const syncService = new SyncService()
