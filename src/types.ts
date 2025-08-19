
export interface Note {
  id: string
  user_id?: string | null
  title: string
  content: string
  status: string // todo, doing, done
  updated_at: string // ISO
  synced?: boolean // local flag to track sync status
}

export interface OutboxOperation {
  id: string
  operation: 'create' | 'update' | 'delete'
  table: 'notes'
  record_id: string
  data?: Note
  created_at: string
  retry_count: number
}
