export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

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
          surprise_mode: boolean
          show_playlist: boolean
          show_now_playing: boolean
          show_guest_requests: boolean
          updated_at: string
        }
        Insert: {
          dj_id: string
          name: string
        }
        Update: {
          name?: string
          status?: string
          surprise_mode?: boolean
          show_playlist?: boolean
          show_now_playing?: boolean
          show_guest_requests?: boolean
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      dj_list_guest_requests: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          room_name: string
          title: string
          artist: string
          video_id: string | null
          submitted_url: string | null
          status: 'pending' | 'approved' | 'rejected'
          created_at: string
          request_source: 'musicbrainz' | 'youtube' | 'manual'
          recording_mbid: string | null
        }[]
      }
      dj_set_guest_request_status: {
        Args: { p_request_id: string; p_status: string }
        Returns: boolean
      }
      guest_music_catalog_search: {
        Args: { p_code: string; p_query: string; p_ip: string; p_limit?: number; p_offset?: number }
        Returns: Json
      }
      music_catalog_import_batch: {
        Args: { p_artist_mbid: string; p_records: Json; p_offset?: number }
        Returns: Json
      }
      room_by_code: {
        Args: { p_code: string }
        Returns: {
          code: string
          name: string
          status: string
          surprise_mode: boolean
          show_playlist: boolean
          show_now_playing: boolean
          show_guest_requests: boolean
        }[]
      }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
