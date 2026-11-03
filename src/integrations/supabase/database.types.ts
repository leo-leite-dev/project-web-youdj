export type Database = {
  public: {
    Tables: {
      dj_profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          updated_at: string
        }
        Insert: {
          display_name: string
          id: string
        }
        Update: {
          display_name?: string
        }
        Relationships: []
      }
      rooms: {
        Row: {
          code: string
          created_at: string
          dj_id: string
          id: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          dj_id: string
          name: string
        }
        Update: {
          name?: string
          status?: string
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      room_by_code: {
        Args: { p_code: string }
        Returns: {
          code: string
          name: string
          status: string
        }[]
      }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
