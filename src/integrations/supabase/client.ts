import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

type SupabaseEnv = Pick<
  ImportMetaEnv,
  'VITE_SUPABASE_URL' | 'VITE_SUPABASE_PUBLISHABLE_KEY'
>

const SUPABASE_URL_VARIABLE = 'VITE_SUPABASE_URL'
const SUPABASE_PUBLISHABLE_KEY_VARIABLE = 'VITE_SUPABASE_PUBLISHABLE_KEY'

function readRequiredEnvironmentVariable(name: string, value: string | undefined): string {
  const normalizedValue = value?.trim()

  if (!normalizedValue) {
    throw new Error(
      `Variável de ambiente obrigatória ausente: ${name}. Configure o arquivo .env.local.`,
    )
  }

  return normalizedValue
}

export function createSupabaseClient(
  env: SupabaseEnv = import.meta.env,
): SupabaseClient<Database> {
  const url = readRequiredEnvironmentVariable(SUPABASE_URL_VARIABLE, env.VITE_SUPABASE_URL)
  const publishableKey = readRequiredEnvironmentVariable(
    SUPABASE_PUBLISHABLE_KEY_VARIABLE,
    env.VITE_SUPABASE_PUBLISHABLE_KEY,
  )

  return createClient<Database>(url, publishableKey)
}

let client: SupabaseClient<Database> | undefined

export function getSupabaseClient(): SupabaseClient<Database> {
  client ??= createSupabaseClient()
  return client
}
