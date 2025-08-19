export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      notes: {
        Row: {
          id: string
          user_id: string | null
          title: string
          content: string
          status: string
          updated_at: string
        }
        Insert: {
          id: string
          user_id?: string | null
          title: string
          content?: string
          status?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          title?: string
          content?: string
          status?: string
          updated_at?: string
        }
      }
    }
  }
}
