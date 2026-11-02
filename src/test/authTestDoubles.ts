import type {
  AuthSession,
  AuthUser,
  DjProfile,
  SignUpInput,
} from '../features/auth/authTypes'
import type {
  AuthGateway,
  AuthGatewaySignUpResult,
  AuthStateListener,
  OAuthSignInOptions,
} from '../features/auth/services/authGateway'
import type { DjProfileStore } from '../features/auth/services/djProfileStore'

export function makeAuthUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    email: 'dj@example.com',
    id: '11111111-1111-4111-8111-111111111111',
    isAnonymous: false,
    metadataDisplayName: 'DJ Teste',
    ...overrides,
  }
}

export function makeAuthSession(overrides: Partial<AuthUser> = {}): AuthSession {
  return { user: makeAuthUser(overrides) }
}

export function makeDjProfile(overrides: Partial<DjProfile> = {}): DjProfile {
  return {
    createdAt: '2026-11-02T12:00:00.000Z',
    displayName: 'DJ Teste',
    id: '11111111-1111-4111-8111-111111111111',
    updatedAt: '2026-11-02T12:00:00.000Z',
    ...overrides,
  }
}

interface FakeAuthGatewayOptions {
  getSessionError?: unknown
  oauthError?: unknown
  oauthUrl?: string
  session?: AuthSession | null
  signInError?: unknown
  signInSession?: AuthSession
  signOutError?: unknown
  signUpError?: unknown
  signUpResult?: AuthGatewaySignUpResult
}

export class FakeAuthGateway implements AuthGateway {
  readonly oauthCalls: OAuthSignInOptions[] = []
  readonly oauthUrl: string
  readonly signInCalls: Array<{ email: string; password: string }> = []
  readonly signUpCalls: SignUpInput[] = []
  signOutCalls = 0

  private session: AuthSession | null
  private readonly getSessionError?: unknown
  private readonly listeners = new Set<AuthStateListener>()
  private readonly oauthError?: unknown
  private readonly signInError?: unknown
  private readonly signInSession?: AuthSession
  private readonly signOutError?: unknown
  private readonly signUpError?: unknown
  private readonly signUpResult?: AuthGatewaySignUpResult

  constructor(options: FakeAuthGatewayOptions = {}) {
    this.session = options.session ?? null
    this.getSessionError = options.getSessionError
    this.oauthError = options.oauthError
    this.oauthUrl = options.oauthUrl ?? 'https://example.supabase.co/auth/v1/authorize?provider=google'
    this.signInError = options.signInError
    this.signInSession = options.signInSession
    this.signOutError = options.signOutError
    this.signUpError = options.signUpError
    this.signUpResult = options.signUpResult
  }

  emit(session: AuthSession | null) {
    this.session = session

    for (const listener of this.listeners) {
      listener(session)
    }
  }

  async getSession(): Promise<AuthSession | null> {
    if (this.getSessionError) {
      throw this.getSessionError
    }

    return this.session
  }

  async signInWithOAuth(options: OAuthSignInOptions) {
    this.oauthCalls.push(options)

    if (this.oauthError) {
      throw this.oauthError
    }

    return { url: this.oauthUrl }
  }

  async signInWithPassword(email: string, password: string): Promise<AuthSession> {
    this.signInCalls.push({ email, password })

    if (this.signInError) {
      throw this.signInError
    }

    const session = this.signInSession ?? this.session

    if (!session) {
      throw new Error('Sessão de teste ausente.')
    }

    this.emit(session)
    return session
  }

  async signUp(input: SignUpInput): Promise<AuthGatewaySignUpResult> {
    this.signUpCalls.push(input)

    if (this.signUpError) {
      throw this.signUpError
    }

    const result = this.signUpResult ?? {
      needsEmailConfirmation: false,
      session: makeAuthSession({ metadataDisplayName: input.displayName }),
    }

    if (result.session) {
      this.emit(result.session)
    }

    return result
  }

  async signOut(): Promise<void> {
    this.signOutCalls += 1

    if (this.signOutError) {
      throw this.signOutError
    }

    this.emit(null)
  }

  subscribeToAuthState(listener: AuthStateListener): () => void {
    this.listeners.add(listener)

    return () => {
      this.listeners.delete(listener)
    }
  }
}

interface FakeDjProfileStoreOptions {
  createError?: unknown
  findError?: unknown
  profiles?: DjProfile[]
}

export class FakeDjProfileStore implements DjProfileStore {
  readonly createCalls: Array<{ displayName: string; userId: string }> = []
  readonly findCalls: string[] = []
  readonly profiles: DjProfile[]

  private readonly createError?: unknown
  private readonly findError?: unknown

  constructor(options: FakeDjProfileStoreOptions = {}) {
    this.createError = options.createError
    this.findError = options.findError
    this.profiles = options.profiles ?? []
  }

  async findById(userId: string): Promise<DjProfile | null> {
    this.findCalls.push(userId)

    if (this.findError) {
      throw this.findError
    }

    return this.profiles.find((profile) => profile.id === userId) ?? null
  }

  async createIfMissing(userId: string, displayName: string): Promise<DjProfile> {
    this.createCalls.push({ displayName, userId })

    if (this.createError) {
      throw this.createError
    }

    const existingProfile = await this.findById(userId)

    if (existingProfile) {
      return existingProfile
    }

    const profile = makeDjProfile({ displayName, id: userId })
    this.profiles.push(profile)
    return profile
  }
}
