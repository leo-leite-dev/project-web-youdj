import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Brand } from '../components/Brand'
import {
  ClockIcon,
  ListMusicIcon,
  MusicIcon,
  QrCodeIcon,
  SettingsIcon,
  ShieldCheckIcon,
  UsersIcon,
} from '../components/Icons'
import { useAuth } from '../features/auth/AuthContext'
import { SignOutButton } from '../features/auth/components/SignOutButton'

const upcomingItems = [
  { label: 'Pedidos', icon: ListMusicIcon },
  { label: 'Configurações', icon: SettingsIcon },
]

export function DjLayout() {
  const { profile, user } = useAuth()
  const isRoomsPage = useLocation().pathname === '/dj/painel/salas'
  const displayName = profile?.displayName ?? user?.email ?? 'DJ'
  const initial = displayName.trim().charAt(0).toUpperCase() || 'D'

  return (
    <div className={`dj-layout flex min-h-svh bg-night-950 ${isRoomsPage ? 'dj-layout--rooms' : ''}`}>
      <aside className="dj-sidebar hidden w-64 shrink-0 flex-col border-r border-white/8 bg-night-900/60 lg:flex">
        <div className="p-6">
          {isRoomsPage ? (
            <div className="rooms-brand" aria-label="YouDJ">
              <span className="rooms-brand-disc" aria-hidden="true">◉</span>
              <strong><span>You</span>DJ</strong>
              <i aria-hidden="true"><b /><b /><b /><b /><b /></i>
            </div>
          ) : <Brand />}
        </div>

        <div className="px-4">
          <p className="dj-nav-label px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
            Painel do DJ
          </p>
          <nav className="dj-nav mt-3 space-y-1" aria-label="Navegação do painel">
            {isRoomsPage ? (
              <>
                <NavLink to="/dj/painel/salas" className={({ isActive }) => `rooms-nav-active flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${isActive ? 'active text-accent-300' : ''}`}>
                  <QrCodeIcon className="size-5" /> Salas
                </NavLink>
                <span className="rooms-nav-disabled"><MusicIcon className="size-5" /> Músicas</span>
                <span className="rooms-nav-disabled"><ListMusicIcon className="size-5" /> Pedidos</span>
                <span className="rooms-nav-disabled"><SettingsIcon className="size-5" /> Configurações</span>
                <span className="rooms-nav-disabled"><UsersIcon className="size-5" /> Conta</span>
              </>
            ) : <>
            <NavLink
              to="/dj/painel/salas"
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-accent-500/15 text-accent-300'
                    : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <QrCodeIcon className="size-4" />
              Salas
            </NavLink>

            {upcomingItems.map(({ label, icon: Icon }) => (
              <span
                key={label}
                aria-disabled="true"
                className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-600"
              >
                <Icon className="size-4" />
                {label}
                <span className="ml-auto rounded-full bg-white/5 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider">
                  em breve
                </span>
              </span>
            ))}
            </>}
          </nav>
        </div>

        {isRoomsPage ? (
          <div className="rooms-sidebar-equalizer" aria-hidden="true">
            {[22, 46, 31, 82, 105, 69, 35, 52, 118, 90, 64, 38, 76, 105, 54].map((height, index) => (
              <i key={index} style={{ height }} />
            ))}
          </div>
        ) : null}

        <div className="mt-auto p-4">
          <div className="rounded-2xl border border-white/10 bg-white/3 p-4">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-300">
              <ShieldCheckIcon className="size-3.5" />
              Sessão ativa
            </p>
            <div className="mt-3 flex items-center gap-2.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent-500/15 text-sm font-semibold text-accent-200">
                {initial}
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-zinc-100">{displayName}</p>
                <p className="truncate text-[10px] text-zinc-500">{user?.email}</p>
              </div>
            </div>
            <SignOutButton className="mt-3 w-full" />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-white/8 bg-night-950/80 px-5 py-3 backdrop-blur-xl lg:hidden">
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
        </header>

        <main className={`dj-main flex-1 p-5 sm:p-8 ${isRoomsPage ? 'dj-main--rooms' : ''}`}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
