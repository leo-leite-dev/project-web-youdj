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
      dj_delete_room: { Args: { p_room_id: string }; Returns: boolean }
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
        }[]
      }
      dj_list_room_guest_requests: {
        Args: { p_room_id: string }
        Returns: {
          id: string
          room_name: string
          title: string
          artist: string
          video_id: string | null
          submitted_url: string | null
          guest_name: string
          status: 'pending' | 'approved' | 'rejected'
          created_at: string
        }[]
      }
      dj_list_room_music_queue: {
        Args: { p_room_id: string }
        Returns: { request_id: string; title: string; artist: string; video_id: string | null; submitted_url: string | null; guest_name: string; position: number; added_at: string; source: 'request' | 'dj' }[]
      }
      dj_add_youtube_track_to_queue: { Args: { p_room_id: string; p_video_id: string }; Returns: string }
      dj_reorder_room_music_queue: { Args: { p_room_id: string; p_request_ids: string[] }; Returns: boolean }
      dj_remove_room_music_queue_item: { Args: { p_room_id: string; p_request_id: string }; Returns: boolean }
      dj_mark_room_request_played: { Args: { p_room_id: string; p_request_id: string }; Returns: boolean }
      dj_list_room_played_requests: { Args: { p_room_id: string }; Returns: string[] }
      dj_get_room_management_context: {
        Args: { p_room_id: string }
        Returns: {
          room_id: string
          room_name: string
          code: string
          status: string
          dj_name: string
          access_role: 'owner' | 'moderator'
          surprise_mode: boolean
          show_playlist: boolean
          show_now_playing: boolean
          show_guest_requests: boolean
        }[]
      }
      dj_list_room_moderators: {
        Args: { p_room_id: string }
        Returns: { user_id: string; email: string | null; display_name: string; created_at: string }[]
      }
      dj_invite_room_moderator: {
        Args: { p_room_id: string; p_email: string }
        Returns: boolean
      }
      dj_revoke_room_moderator: {
        Args: { p_room_id: string; p_moderator_id: string }
        Returns: boolean
      }
      dj_guest_request_summary: {
        Args: Record<PropertyKey, never>
        Returns: { pending_count: number; approved_count: number; rejected_count: number }[]
      }
      dj_room_online_guests: {
        Args: { p_room_id: string }
        Returns: { online_count: number; guest_name: string | null; last_seen_at: string | null; guest_id: string | null; is_vip: boolean }[]
      }
      dj_set_room_guest_vip: {
        Args: { p_room_id: string; p_guest_id: string; p_enabled: boolean }
        Returns: boolean
      }
      dj_list_room_guest_vips: {
        Args: { p_room_id: string }
        Returns: { guest_id: string; guest_name: string; granted_at: string }[]
      }
      dj_set_guest_request_status: {
        Args: { p_request_id: string; p_status: string }
        Returns: boolean
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
      room_by_code_with_membership: {
        Args: { p_code: string }
        Returns: {
          code: string
          name: string
          status: string
          surprise_mode: boolean
          show_playlist: boolean
          show_now_playing: boolean
          show_guest_requests: boolean
          dj_name: string
          viewer_role: 'owner' | 'moderator' | 'guest' | 'unauthorized'
          room_id: string | null
        }[]
      }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
