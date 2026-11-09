import { fireEvent, render, screen, within } from '@testing-library/react'
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AuthContext } from '../features/auth/AuthContext'
import type { AuthContextValue } from '../features/auth/authTypes'
import { makeAuthUser, makeDjProfile } from '../test/authTestDoubles'
import { DjLayout } from './DjLayout'

const authValue: AuthContextValue = {
  error: null,
  profile: makeDjProfile(),
  profileError: null,
  profileStatus: 'ready',
  refreshSession: () => {},
  retryProfile: () => {},
  signIn: async () => {},
  signInWithGoogle: async () => {},
  signOut: () => Promise.resolve(),
  signUp: async () => ({ needsEmailConfirmation: false }),
  status: 'authenticated',
  user: makeAuthUser(),
}

describe('DjLayout navigation', () => {
  it('keeps the active Salas link in the desktop sidebar without upcoming badges', () => {
    render(
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={['/dj/painel/salas']}>
          <Routes>
            <Route path="/dj/painel" element={<DjLayout />}>
              <Route path="salas" element={<h1>Gerenciamento de salas</h1>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    expect(screen.getByRole('heading', { name: 'Gerenciamento de salas' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Visão geral' })).not.toBeInTheDocument()
    const roomLinks = screen.getAllByRole('link', { name: 'Salas' })
    expect(roomLinks).toHaveLength(1)
    expect(roomLinks.every((link) => link.getAttribute('href') === '/dj/painel/salas')).toBe(true)
    expect(roomLinks.every((link) => link.className.includes('text-accent-300'))).toBe(true)
    roomLinks.forEach((link) => {
      expect(within(link).queryByText('em breve')).not.toBeInTheDocument()
    })
    expect(
      within(screen.getByRole('navigation', { name: 'Navegação do painel' })).getByText('Salas'),
    ).toBeInTheDocument()
    const desktopSidebar = screen.getByRole('complementary', { name: 'Navegação do painel' })
    expect(desktopSidebar).toHaveClass('dj-sidebar-shell')
    expect(screen.getAllByRole('complementary')).toHaveLength(1)
    expect(within(desktopSidebar).getByText('PAINEL DO DJ')).toBeInTheDocument()
    expect(within(desktopSidebar).getByRole('img', { name: /YouDJ/ })).toBeInTheDocument()
    expect(desktopSidebar.querySelector('.rooms-sidebar-equalizer')).toBeInTheDocument()
    expect(within(desktopSidebar).queryByText('Músicas')).not.toBeInTheDocument()
    expect(within(desktopSidebar).queryByText('Pedidos')).not.toBeInTheDocument()
    expect(within(desktopSidebar).queryByRole('link', { name: 'Site' })).not.toBeInTheDocument()
    expect(within(desktopSidebar).queryByRole('button', { name: 'Sair' })).not.toBeInTheDocument()
  })

  it('keeps the overview out of navigation on individual room management pages', () => {
    render(
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={['/dj/painel/salas/room-a']}>
          <Routes>
            <Route path="/dj/painel" element={<DjLayout />}>
              <Route path="salas/:roomId" element={<h1>Gerenciamento individual</h1>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    expect(screen.getByRole('heading', { name: 'Gerenciamento individual' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Visão geral' })).not.toBeInTheDocument()
    const sidebar = screen.getByRole('complementary', { name: 'Navegação do painel' })
    expect(sidebar).toHaveClass('dj-sidebar-shell')
    expect(screen.getAllByRole('complementary')).toHaveLength(1)
    expect(within(sidebar).getByText('PAINEL DO DJ')).toBeInTheDocument()
    expect(within(sidebar).getByRole('img', { name: /YouDJ/ })).toBeInTheDocument()
    const roomsLink = within(sidebar).getByRole('link', { name: 'Salas' })
    expect(roomsLink).toHaveAttribute('href', '/dj/painel/salas')
    expect(roomsLink).toHaveClass('active')
    expect(sidebar.querySelector('.rooms-sidebar-equalizer')).toBeInTheDocument()
    const managementLayout = document.querySelector('.dj-layout--room-management')
    expect(managementLayout).toBeInTheDocument()
    expect(managementLayout?.querySelector('header.room-mobile-header')).toBeInTheDocument()
  })

  it('keeps the sidebar mounted during room-route loading and marks the duplicate shortcut for hiding', () => {
    render(
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={['/dj/painel/salas']}>
          <Routes>
            <Route path="/dj/painel" element={<DjLayout />}>
              <Route path="salas" element={<Link to="/dj/painel/salas/room-a">Gerenciar sala</Link>} />
              <Route path="salas/:roomId" element={<section role="status">Carregando sala…</section>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    const sidebarBeforeNavigation = screen.getByRole('complementary', { name: 'Navegação do painel' })
    fireEvent.click(screen.getByRole('link', { name: 'Gerenciar sala' }))

    expect(screen.getByRole('status')).toHaveTextContent('Carregando sala…')
    expect(screen.getByRole('complementary', { name: 'Navegação do painel' })).toBe(sidebarBeforeNavigation)
    expect(screen.getAllByRole('complementary')).toHaveLength(1)
    expect(document.querySelector('.dj-layout--room-management')).toBeInTheDocument()
    expect(document.querySelector('.dj-layout--room-management header.room-mobile-header')).toBeInTheDocument()
    expect(document.querySelector('.dj-layout--room-management .room-art-nav')).toBeInTheDocument()
  })

  it('shows only the original YouDJ banner in the mobile header for a room', () => {
    render(
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={['/dj/painel/salas/room-a']}>
          <Routes>
            <Route path="/dj/painel" element={<DjLayout />}>
              <Route path="salas/:roomId" element={<h1>Gerenciamento individual</h1>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    const mobileHeader = screen.getByRole('banner')
    expect(within(mobileHeader).getByRole('img', { name: 'YouDJ' })).toBeInTheDocument()
    expect(within(mobileHeader).queryByRole('link', { name: 'Salas' })).not.toBeInTheDocument()
    expect(within(mobileHeader).queryByRole('button', { name: 'Sair' })).not.toBeInTheDocument()
    expect(within(mobileHeader).queryByText(authValue.user?.email ?? '')).not.toBeInTheDocument()
    expect(within(mobileHeader).queryByText('Ana DJ')).not.toBeInTheDocument()
  })

  it('uses the original YouDJ banner on the rooms-list mobile header', () => {
    render(
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={['/dj/painel/salas']}>
          <Routes>
            <Route path="/dj/painel" element={<DjLayout />}>
              <Route path="salas" element={<h1>Gerenciamento de salas</h1>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    const mobileHeader = screen.getByRole('banner')
    expect(within(mobileHeader).getByRole('img', { name: 'YouDJ' })).toBeInTheDocument()
    expect(within(mobileHeader).queryByText('DJ IA')).not.toBeInTheDocument()
    expect(within(mobileHeader).queryByText('MUSIC REQUESTS')).not.toBeInTheDocument()
    expect(within(mobileHeader).queryByRole('button', { name: 'Sair' })).not.toBeInTheDocument()
  })
})
