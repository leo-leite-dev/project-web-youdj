export interface AuthUser {
  email: string | null
  id: string
  isAnonymous: boolean
  metadataDisplayName: string | null
}

export interface AuthSession {
  user: AuthUser
}

export interface DjProfile {
  createdAt: string
  displayName: string
  id: string
  updatedAt: string
}

export interface SignUpInput {
  displayName: string
  email: string
  password: string
}

export interface SignUpResult {
  needsEmailConfirmation: boolean
}

export type AuthStatus =
  | 'loading'
  | 'authenticated'
  | 'anonymous'
  | 'unauthenticated'
  | 'error'

export type ProfileStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface AuthContextValue {
  error: string | null
  profile: DjProfile | null
  profileError: string | null
  profileStatus: ProfileStatus
  refreshSession: () => void
  retryProfile: () => void
  signIn: (email: string, password: string) => Promise<void>
  signInWithGoogle: (destination?: string) => Promise<void>
  signOut: () => Promise<void>
  signUp: (input: SignUpInput) => Promise<SignUpResult>
  status: AuthStatus
  user: AuthUser | null
}
