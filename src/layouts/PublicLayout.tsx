import { Link, Outlet, useLocation } from 'react-router-dom'
import { Brand } from '../components/Brand'
import { ArrowRightIcon } from '../components/Icons'

export function PublicLayout() {
  const isGuestRoom = useLocation().pathname.startsWith('/sala/')

  return (
    <div className="flex min-h-svh flex-col">
      <header className={`sticky top-0 z-40 border-b backdrop-blur-xl ${isGuestRoom ? 'border-fuchsia-400/20 bg-[#07060c]/95 shadow-[0_4px_24px_rgba(217,70,239,0.08)]' : 'border-white/8 bg-night-950/80'}`}>
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
          <Brand />
          <nav className="flex items-center gap-2 sm:gap-5" aria-label="Navegação principal">
            <a
              href="/#como-funciona"
              className="hidden rounded-lg px-2 py-2 text-sm font-medium text-zinc-400 transition-colors hover:text-white sm:block"
            >
              Como funciona
            </a>
            <Link
              to="/dj"
              className={isGuestRoom
                ? 'group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-pink-500 p-[2px] text-sm font-semibold text-white shadow-[0_0_18px_rgba(217,70,239,0.18)] transition hover:shadow-[0_0_24px_rgba(34,211,238,0.28)]'
                : 'group inline-flex items-center gap-2 rounded-xl bg-white px-3.5 py-2.5 text-sm font-semibold text-night-950 transition-colors hover:bg-accent-300 sm:px-4'}
            >
              {isGuestRoom
                ? <span className="inline-flex items-center gap-2 rounded-full bg-night-950 px-3 py-2">Área do DJ<ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" /></span>
                : <>Área do DJ<ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" /></>}
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-white/8 bg-night-900/40">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-10 sm:px-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-md space-y-3">
            <Brand />
            <p className="text-sm leading-6 text-zinc-500">
              Pedidos musicais enviados pelo convidado ficam sujeitos à decisão do DJ.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-xs text-zinc-500">
            <Link to="/termos-de-uso" className="min-h-11 inline-flex items-center underline underline-offset-4 hover:text-white">Termos de Uso</Link>
            <Link to="/privacidade" className="min-h-11 inline-flex items-center underline underline-offset-4 hover:text-white">Política de Privacidade</Link>
            <span>© {new Date().getFullYear()} YouDJ</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
