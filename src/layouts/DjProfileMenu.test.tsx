import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../features/auth/AuthContext'
import type { AuthContextValue } from '../features/auth/authTypes'
import { makeAuthUser, makeDjProfile } from '../test/authTestDoubles'
import { DjProfileMenu } from './DjProfileMenu'

describe('DjProfileMenu', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('keeps the existing sign-out action and closes with Escape', () => {
    const signOut = vi.fn(async () => {})
    const authValue: AuthContextValue = {
      error: null,
      profile: makeDjProfile(),
      profileError: null,
      profileStatus: 'ready',
      refreshSession: () => {},
      retryProfile: () => {},
      signIn: async () => {},
      signInWithGoogle: async () => {},
      signOut,
      signUp: async () => ({ needsEmailConfirmation: false }),
      status: 'authenticated',
      user: makeAuthUser(),
    }

    render(
      <AuthContext.Provider value={authValue}>
        <DjProfileMenu />
      </AuthContext.Provider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'DJ: DJ Teste' }))
    const menu = screen.getByRole('menu', { name: 'Menu do perfil' })
    expect(within(menu).getByRole('menuitem', { name: 'Sair da conta' })).toBeInTheDocument()
    expect(within(menu).queryByText('Minha conta')).not.toBeInTheDocument()
    expect(within(menu).queryByText('Configurações')).not.toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('menu', { name: 'Menu do perfil' })).not.toBeInTheDocument()
  })

  it('portals the desktop menu to the document so header effects cannot constrain its fixed position', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
      matches: true,
      media: '(min-width: 601px)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))

    const authValue: AuthContextValue = {
      error: null,
      profile: makeDjProfile(),
      profileError: null,
      profileStatus: 'ready',
      refreshSession: () => {},
      retryProfile: () => {},
      signIn: async () => {},
      signInWithGoogle: async () => {},
      signOut: async () => {},
      signUp: async () => ({ needsEmailConfirmation: false }),
      status: 'authenticated',
      user: makeAuthUser(),
    }

    const { container } = render(
      <AuthContext.Provider value={authValue}>
        <div className="room-management-hero"><DjProfileMenu /></div>
      </AuthContext.Provider>,
    )

    const profileButton = screen.getByRole('button', { name: 'DJ: DJ Teste' })
    expect(container.querySelector('.dj-profile-menu-wrap')).not.toBeInTheDocument()
    expect(profileButton.closest('.dj-profile-menu-wrap')?.parentElement).toBe(document.body)
  })
})
