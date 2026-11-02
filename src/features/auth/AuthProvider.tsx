import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type {
  AuthContextValue,
  AuthSession,
  AuthStatus,
  AuthUser,
  DjProfile,
  ProfileStatus,
  SignUpInput,
} from './authTypes'
import { AuthContext } from './AuthContext'
import { getAuthErrorMessage, getProfileErrorMessage } from './lib/authErrors'
import { normalizeDisplayName, normalizeEmail } from './lib/authValidation'
import {
  clearOAuthIntent,
  getDefaultDjDestination,
  getLocalDevelopmentPortError,
  getOAuthRedirectUrl,
  OAuthFlowError,
  storeOAuthIntent,
} from './lib/oauthFlow'
import { redirectToAuthorization } from './lib/oauthNavigation'
import { resolveProfileDisplayName } from './lib/profileName'
import type { AuthGateway } from './services/authGateway'
import { createSupabaseAuthGateway } from './services/authGateway'
import type { DjProfileStore } from './services/djProfileStore'
import { createSupabaseDjProfileStore } from './services/djProfileStore'
import { ensureDjProfile } from './services/ensureDjProfile'

interface AuthProviderProps {
  authGateway?: AuthGateway
  children: ReactNode
  profileStore?: DjProfileStore
}

interface SessionState {
  error: string | null
  status: AuthStatus
  user: AuthUser | null
}

interface ProfileResult {
  error: string | null
  profile: DjProfile | null
  userId: string
}

function createUnavailableAuthGateway(error: unknown): AuthGateway {
  const reject = async (): Promise<never> => {
    throw error
  }

  return {
    getSession: reject,
    signInWithOAuth: reject,
    signInWithPassword: reject,
    signOut: reject,
    signUp: reject,
    subscribeToAuthState: () => () => undefined,
  }
}

function createUnavailableProfileStore(error: unknown): DjProfileStore {
  const reject = async (): Promise<never> => {
    throw error
  }

  return {
    createIfMissing: reject,
    findById: reject,
  }
}

function toSessionState(session: AuthSession | null): SessionState {
  if (!session) {
    return { error: null, status: 'unauthenticated', user: null }
  }

  if (session.user.isAnonymous) {
    return { error: null, status: 'anonymous', user: session.user }
  }

  return { error: null, status: 'authenticated', user: session.user }
}

export function AuthProvider({
  authGateway: authGatewayOverride,
  children,
  profileStore: profileStoreOverride,
}: AuthProviderProps) {
  const [gateway] = useState<AuthGateway>(
    () => {
      if (authGatewayOverride) {
        return authGatewayOverride
      }

      try {
        return createSupabaseAuthGateway()
      } catch (error) {
        return createUnavailableAuthGateway(error)
      }
    },
  )
  const [profileStore] = useState<DjProfileStore>(
    () => {
      if (profileStoreOverride) {
        return profileStoreOverride
      }

      try {
        return createSupabaseDjProfileStore()
      } catch (error) {
        return createUnavailableProfileStore(error)
      }
    },
  )
  const [sessionState, setSessionState] = useState<SessionState>({
    error: null,
    status: 'loading',
    user: null,
  })
  const [sessionAttempt, setSessionAttempt] = useState(0)
  const [profileResult, setProfileResult] = useState<ProfileResult | null>(null)
  const [profileAttempt, setProfileAttempt] = useState(0)
  const authMutationVersion = useRef(0)

  useEffect(() => {
    let active = true
    let receivedAuthEvent = false
    const initialMutationVersion = authMutationVersion.current

    const unsubscribe = gateway.subscribeToAuthState((session) => {
      receivedAuthEvent = true
      authMutationVersion.current += 1

      if (!active) {
        return
      }

      setSessionState(toSessionState(session))

      if (!session) {
        setProfileResult(null)
      }
    })

    void gateway
      .getSession()
      .then((session) => {
        if (
          !active ||
          receivedAuthEvent ||
          initialMutationVersion !== authMutationVersion.current
        ) {
          return
        }

        setSessionState(toSessionState(session))
      })
      .catch((error: unknown) => {
        if (
          !active ||
          receivedAuthEvent ||
          initialMutationVersion !== authMutationVersion.current
        ) {
          return
        }

        setSessionState({
          error: getAuthErrorMessage(error),
          status: 'error',
          user: null,
        })
      })

    return () => {
      active = false
      unsubscribe()
    }
  }, [gateway, sessionAttempt])

  const profileUser = sessionState.status === 'authenticated' ? sessionState.user : null
  const profileUserId = profileUser?.id ?? null
  const profileDisplayName = profileUser ? resolveProfileDisplayName(profileUser) : null

  useEffect(() => {
    if (!profileUserId || !profileDisplayName) {
      return
    }

    let active = true

    void ensureDjProfile(profileStore, profileUserId, profileDisplayName)
      .then((profile) => {
        if (active) {
          setProfileResult({ error: null, profile, userId: profileUserId })
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setProfileResult({
            error: getProfileErrorMessage(error),
            profile: null,
            userId: profileUserId,
          })
        }
      })

    return () => {
      active = false
    }
  }, [profileAttempt, profileDisplayName, profileStore, profileUserId])

  const signIn = useCallback(
    async (email: string, password: string) => {
      const session = await gateway.signInWithPassword(normalizeEmail(email), password)
      authMutationVersion.current += 1
      clearOAuthIntent()
      setProfileResult(null)
      setSessionState(toSessionState(session))
    },
    [gateway],
  )

  const signUp = useCallback(
    async (input: SignUpInput) => {
      const result = await gateway.signUp({
        displayName: normalizeDisplayName(input.displayName),
        email: normalizeEmail(input.email),
        password: input.password,
      })

      if (result.session) {
        authMutationVersion.current += 1
        setProfileResult(null)
        setSessionState(toSessionState(result.session))
      }

      return { needsEmailConfirmation: result.needsEmailConfirmation }
    },
    [gateway],
  )

  const signInWithGoogle = useCallback(
    async (destination?: string) => {
      const localPortError = getLocalDevelopmentPortError()

      if (localPortError) {
        throw new OAuthFlowError(localPortError)
      }

      const redirectTo = getOAuthRedirectUrl()

      if (!redirectTo) {
        throw new OAuthFlowError(
          'Não foi possível determinar o endereço de retorno do login com o Google.',
        )
      }

      const target = destination ?? getDefaultDjDestination()
      storeOAuthIntent(target)

      try {
        const { url } = await gateway.signInWithOAuth({
          provider: 'google',
          redirectTo,
        })

        redirectToAuthorization(url)
      } catch (error) {
        clearOAuthIntent()
        throw error
      }
    },
    [gateway],
  )

  const signOut = useCallback(async () => {
    await gateway.signOut()
    authMutationVersion.current += 1
    setProfileResult(null)
    setSessionState({ error: null, status: 'unauthenticated', user: null })
  }, [gateway])

  const refreshSession = useCallback(() => {
    authMutationVersion.current += 1
    setProfileResult(null)
    setSessionState({ error: null, status: 'loading', user: null })
    setSessionAttempt((attempt) => attempt + 1)
  }, [])

  const retryProfile = useCallback(() => {
    setProfileResult(null)
    setProfileAttempt((attempt) => attempt + 1)
  }, [])

  const currentProfileResult =
    profileUserId && profileResult?.userId === profileUserId ? profileResult : null

  let profileStatus: ProfileStatus = 'idle'

  if (profileUserId) {
    profileStatus = currentProfileResult
      ? currentProfileResult.error
        ? 'error'
        : 'ready'
      : 'loading'
  }

  const profile = currentProfileResult?.profile ?? null
  const profileError = currentProfileResult?.error ?? null

  const value = useMemo<AuthContextValue>(
    () => ({
      error: sessionState.error,
      profile,
      profileError,
      profileStatus,
      refreshSession,
      retryProfile,
      signIn,
      signInWithGoogle,
      signOut,
      signUp,
      status: sessionState.status,
      user: sessionState.user,
    }),
    [
      profile,
      profileError,
      profileStatus,
      refreshSession,
      retryProfile,
      sessionState.error,
      sessionState.status,
      sessionState.user,
      signIn,
      signInWithGoogle,
      signOut,
      signUp,
    ],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
