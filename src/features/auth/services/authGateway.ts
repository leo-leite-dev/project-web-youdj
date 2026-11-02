import type { Session, SupabaseClient, User } from '@supabase/supabase-js'
import { getSupabaseClient } from '../../../integrations/supabase/client'
import type { Database } from '../../../integrations/supabase/database.types'
import type { AuthSession, AuthUser, SignUpInput } from '../authTypes'
import { normalizeDisplayName } from '../lib/authValidation'

export type AuthStateListener = (session: AuthSession | null) => void

export interface AuthGatewaySignUpResult {
  needsEmailConfirmation: boolean
  session: AuthSession | null
}

export interface OAuthSignInOptions {
  provider: 'google'
  redirectTo: string
}

export interface OAuthAuthorization {
  url: string
}

export interface AuthGateway {
  getSession: () => Promise<AuthSession | null>
  signInWithOAuth: (options: OAuthSignInOptions) => Promise<OAuthAuthorization>
  signInWithPassword: (email: string, password: string) => Promise<AuthSession>
  signOut: () => Promise<void>
  signUp: (input: SignUpInput) => Promise<AuthGatewaySignUpResult>
  subscribeToAuthState: (listener: AuthStateListener) => () => void
}

function getMetadataDisplayName(user: User): string | null {
  const metadata = user.user_metadata as Record<string, unknown> | undefined
  const candidates = [metadata?.display_name, metadata?.full_name, metadata?.name]

  for (const candidate of candidates) {
    if (typeof candidate !== 'string') {
      continue
    }

    const displayName = normalizeDisplayName(candidate)

    if (displayName) {
      return displayName
    }
  }

  return null
}

function toAuthUser(user: User): AuthUser {
  return {
    email: typeof user.email === 'string' ? user.email : null,
    id: user.id,
    isAnonymous: user.is_anonymous === true,
    metadataDisplayName: getMetadataDisplayName(user),
  }
}

function toAuthSession(session: Session): AuthSession {
  return { user: toAuthUser(session.user) }
}

class SupabaseAuthGateway implements AuthGateway {
  private readonly client: SupabaseClient<Database>

  constructor(client: SupabaseClient<Database>) {
    this.client = client
  }

  async getSession(): Promise<AuthSession | null> {
    const { data, error } = await this.client.auth.getSession()

    if (error) {
      throw error
    }

    return data.session ? toAuthSession(data.session) : null
  }

  async signInWithOAuth(options: OAuthSignInOptions): Promise<OAuthAuthorization> {
    const { data, error } = await this.client.auth.signInWithOAuth({
      provider: options.provider,
      options: {
        redirectTo: options.redirectTo,
        skipBrowserRedirect: true,
      },
    })

    if (error) {
      throw error
    }

    if (!data.url) {
      throw new Error('O provedor de autenticação não retornou uma URL de autorização.')
    }

    return { url: data.url }
  }

  async signInWithPassword(email: string, password: string): Promise<AuthSession> {
    const { data, error } = await this.client.auth.signInWithPassword({ email, password })

    if (error) {
      throw error
    }

    if (!data.session) {
      throw new Error('A sessão autenticada não foi criada.')
    }

    return toAuthSession(data.session)
  }

  async signUp(input: SignUpInput): Promise<AuthGatewaySignUpResult> {
    const { data, error } = await this.client.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: {
          display_name: input.displayName,
        },
      },
    })

    if (error) {
      throw error
    }

    return {
      needsEmailConfirmation: data.session === null,
      session: data.session ? toAuthSession(data.session) : null,
    }
  }

  async signOut(): Promise<void> {
    const { error } = await this.client.auth.signOut()

    if (error) {
      throw error
    }
  }

  subscribeToAuthState(listener: AuthStateListener): () => void {
    const { data } = this.client.auth.onAuthStateChange((_event, session) => {
      listener(session ? toAuthSession(session) : null)
    })

    return () => {
      data.subscription.unsubscribe()
    }
  }
}

export function createSupabaseAuthGateway(
  client: SupabaseClient<Database> = getSupabaseClient(),
): AuthGateway {
  return new SupabaseAuthGateway(client)
}
