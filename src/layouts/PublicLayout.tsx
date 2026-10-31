import { Link, Outlet } from 'react-router-dom'
import { Brand } from '../components/Brand'
import { ArrowRightIcon } from '../components/Icons'

export function PublicLayout() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-40 border-b border-white/8 bg-night-950/80 backdrop-blur-xl">
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
              className="group inline-flex items-center gap-2 rounded-xl bg-white px-3.5 py-2.5 text-sm font-semibold text-night-950 transition-colors hover:bg-accent-300 sm:px-4"
            >
              Área do DJ
              <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
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
              Fundação inicial do DJ IA. Integrações com Supabase, pagamentos e YouTube serão
              adicionadas em etapas futuras.
            </p>
          </div>
          <p className="text-xs text-zinc-600">
            © {new Date().getFullYear()} DJ IA. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  )
}
