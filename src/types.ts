
export interface Note {
  id: string
  user_id?: string | null
  title: string
  content: string
  updated_at: string // ISO
}
