export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string
          reminder_enabled: boolean
          reminder_time: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          name: string
          reminder_enabled?: boolean
          reminder_time?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          reminder_enabled?: boolean
          reminder_time?: string | null
          updated_at?: string
        }
      }
      conditions: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          color: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          color: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          color?: string
          updated_at?: string
        }
      }
      medications: {
        Row: {
          id: string
          user_id: string
          name: string
          dosage: string
          frequency: string
          notes: string | null
          active: boolean
          condition_ids: string[]
          max_usage_days: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          dosage: string
          frequency: string
          notes?: string | null
          active?: boolean
          condition_ids?: string[]
          max_usage_days?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          dosage?: string
          frequency?: string
          notes?: string | null
          active?: boolean
          condition_ids?: string[]
          max_usage_days?: number | null
          updated_at?: string
        }
      }
      check_ins: {
        Row: {
          id: string
          user_id: string
          date: string
          notes: string | null
          photo_url: string | null
          factors: any // JSON object
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          notes?: string | null
          photo_url?: string | null
          factors?: any
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          notes?: string | null
          photo_url?: string | null
          factors?: any
          updated_at?: string
        }
      }
      condition_entries: {
        Row: {
          id: string
          check_in_id: string
          condition_id: string
          severity: number
          symptoms: string[]
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          check_in_id: string
          condition_id: string
          severity: number
          symptoms?: string[]
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          check_in_id?: string
          condition_id?: string
          severity?: number
          symptoms?: string[]
          notes?: string | null
        }
      }
      medication_entries: {
        Row: {
          id: string
          check_in_id: string
          medication_id: string
          taken: boolean
          times_taken: number | null
          skipped_reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          check_in_id: string
          medication_id: string
          taken: boolean
          times_taken?: number | null
          skipped_reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          check_in_id?: string
          medication_id?: string
          taken?: boolean
          times_taken?: number | null
          skipped_reason?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}