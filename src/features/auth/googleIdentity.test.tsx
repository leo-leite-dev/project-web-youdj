import { render, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  FakeAuthGateway,
  FakeDjProfileStore,
  makeAuthSession,
  makeDjProfile,
} from '../../test/authTestDoubles'
import { AuthProvider } from './AuthProvider'
import { clearOAuthIntent, storeOAuthIntent } from './lib/oauthFlow'

function renderProvider(gateway: FakeAuthGateway, store: FakeDjProfileStore) {
  render(
    <AuthProvider authGateway={gateway} profileStore={store}>
      <span>painel</span>
    </AuthProvider>,
  )

  return store
}

describe('identidade e perfil com Google', () => {
  it('reaproveita o perfil existente do mesmo usuário do Supabase Auth', async () => {
    clearOAuthIntent()
    storeOAuthIntent('/dj/painel')

    const session = makeAuthSession({ metadataDisplayName: 'Nome do Google' })
    const existingProfile = makeDjProfile({ displayName: 'Nome do E-mail' })
    const store = new FakeDjProfileStore({ profiles: [existingProfile] })

    renderProvider(new FakeAuthGateway({ session }), store)

    await waitFor(() => {
      expect(store.findCalls).toEqual([session.user.id])
    })

    expect(store.createCalls).toHaveLength(0)
  })

  it('cria o perfil apenas quando o usuário do Google ainda não tem registro', async () => {
    clearOAuthIntent()

    const session = makeAuthSession({ metadataDisplayName: 'Nome do Google' })
    const store = new FakeDjProfileStore()

    renderProvider(new FakeAuthGateway({ session }), store)

    await waitFor(() => {
      expect(store.createCalls).toHaveLength(1)
    })

    expect(store.createCalls[0]).toEqual({
      displayName: 'Nome do Google',
      userId: session.user.id,
    })
  })
})
