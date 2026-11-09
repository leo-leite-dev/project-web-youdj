import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Brand } from '../components/Brand'
import { YouDJWordmark } from '../components/YouDJWordmark'
import { DjSidebar } from './DjSidebar'
import mobileHeaderBanner from '../assets/Captura de tela 2026-11-08 163310.png'
import {
  ClockIcon,
  ListMusicIcon,
  QrCodeIcon,
  SettingsIcon,
  UsersIcon,
} from '../components/Icons'
import { useAuth } from '../features/auth/AuthContext'
import { SignOutButton } from '../features/auth/components/SignOutButton'
import { DjPlaybackHost, DjPlaybackProvider } from '../features/guest/components/DjPlaybackProvider'

const upcomingItems = [
  { label: 'Pedidos', icon: ListMusicIcon },
  { label: 'Configurações', icon: SettingsIcon },
]

export function DjLayout() {
  const { profile, user } = useAuth()
  const currentPath = useLocation().pathname
  const isRoomManagementPage = /^\/dj\/painel\/salas\/[^/]+$/.test(currentPath)
  const isRoomsPage = currentPath === '/dj/painel/salas' || isRoomManagementPage
  const displayName = profile?.displayName ?? user?.email ?? 'DJ'
  const initial = displayName.trim().charAt(0).toUpperCase() || 'D'

  return (
    <DjPlaybackProvider>
    <div className={`dj-layout flex min-h-svh bg-night-950 ${isRoomsPage ? 'dj-layout--rooms' : ''} ${isRoomManagementPage ? 'dj-layout--room-management' : ''}`}>
      <DjSidebar
        brand={<div className="rooms-brand" aria-label="YouDJ"><YouDJWordmark className="rooms-brand__wordmark" /></div>}
        decoration={(
          <div className="rooms-sidebar-equalizer" aria-hidden="true">
            {[22, 46, 31, 82, 105, 69, 35, 52, 118, 90, 64, 38, 76, 105, 54].map((height, index) => (
              <i key={index} style={{ height }} />
            ))}
          </div>
        )}
      >
        <NavLink to="/dj/painel/salas" className={({ isActive }) => `rooms-nav-active flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${isActive ? 'active text-accent-300' : ''}`}>
          <QrCodeIcon className="size-5" /> Salas
        </NavLink>
        <span className="rooms-nav-disabled"><SettingsIcon className="size-5" /> Configurações</span>
        <span className="rooms-nav-disabled"><UsersIcon className="size-5" /> Conta</span>
      </DjSidebar>
      {isRoomManagementPage && <nav className="room-art-nav" aria-label="Navegação do painel">
        <NavLink to="/dj/painel/salas" className={({ isActive }) => `rooms-nav-active ${isActive ? 'active' : ''}`}>
          <QrCodeIcon className="size-5" /> Salas
        </NavLink>
      </nav>}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className={`sticky top-0 z-30 border-b border-white/8 bg-night-950/80 px-5 py-3 backdrop-blur-xl lg:hidden${isRoomManagementPage ? ' room-mobile-header' : isRoomsPage ? ' rooms-mobile-header' : ''}`}>
          {isRoomsPage ? <div className="room-mobile-banner">
            <img src={mobileHeaderBanner} alt="YouDJ" />
          </div> : <>
            <div className="flex items-center justify-between">
              <Brand />
              <Link
                to="/"
                className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-zinc-300"
              >
                Site
              </Link>
            </div>
            <div className="mt-3 flex items-center gap-2 overflow-x-auto text-xs">
              <NavLink
                to="/dj/painel/salas"
                className={({ isActive }) =>
                  `inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 ${
                    isActive
                      ? 'border-accent-400/30 bg-accent-500/15 text-accent-300'
                      : 'border-white/8 text-zinc-400'
                  }`
                }
              >
                Salas
              </NavLink>
              {upcomingItems.map(({ label }) => (
                <span
                  key={label}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/8 px-3 py-1.5 text-zinc-500"
                >
                  {label}
                  <ClockIcon className="size-3" />
                </span>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/8 pt-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent-500/15 text-xs font-semibold text-accent-200">
                  {initial}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-zinc-100">{displayName}</p>
                  <p className="truncate text-[10px] text-zinc-500">{user?.email}</p>
                </div>
              </div>
              <SignOutButton className="shrink-0" />
            </div>
          </>}
        </header>

        <main className={`dj-main flex-1 p-5 sm:p-8 ${isRoomsPage ? 'dj-main--rooms' : ''}`}>
          <Outlet />
          <DjPlaybackHost />
        </main>
      </div>
    </div>
    </DjPlaybackProvider>
  )
}
