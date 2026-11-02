import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseClient } from '../../../integrations/supabase/client'
import type { Database } from '../../../integrations/supabase/database.types'
import type { DjProfile } from '../authTypes'

type DjProfileRow = Database['public']['Tables']['dj_profiles']['Row']

export interface DjProfileStore {
  createIfMissing: (userId: string, displayName: string) => Promise<DjProfile>
  findById: (userId: string) => Promise<DjProfile | null>
}

function toDjProfile(row: DjProfileRow): DjProfile {
  return {
    createdAt: row.created_at,
    displayName: row.display_name,
    id: row.id,
    updatedAt: row.updated_at,
  }
}

class SupabaseDjProfileStore implements DjProfileStore {
  private readonly client: SupabaseClient<Database>

  constructor(client: SupabaseClient<Database>) {
    this.client = client
  }

  async findById(userId: string): Promise<DjProfile | null> {
    const { data, error } = await this.client
      .from('dj_profiles')
      .select('id, display_name, created_at, updated_at')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      throw error
    }

    return data ? toDjProfile(data) : null
  }

  async createIfMissing(userId: string, displayName: string): Promise<DjProfile> {
    const { error } = await this.client.from('dj_profiles').upsert(
      {
        display_name: displayName,
        id: userId,
      },
      {
        ignoreDuplicates: true,
        onConflict: 'id',
      },
    )

    if (error) {
      throw error
    }

    const profile = await this.findById(userId)

    if (!profile) {
      throw new Error('O perfil do DJ não foi encontrado após a criação.')
    }

    return profile
  }
}

export function createSupabaseDjProfileStore(
  client: SupabaseClient<Database> = getSupabaseClient(),
): DjProfileStore {
  return new SupabaseDjProfileStore(client)
}
