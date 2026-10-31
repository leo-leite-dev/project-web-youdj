import { Link } from 'react-router-dom'
import { ArrowRightIcon, HomeIcon } from '../components/Icons'

export function NotFoundPage() {
  return (
    <section className="mx-auto flex min-h-[calc(100svh-10rem)] w-full max-w-xl flex-col items-center justify-center px-5 py-16 text-center sm:px-8">
      <p className="font-mono text-sm font-semibold tracking-[0.3em] text-accent-400">404</p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
        Página não encontrada
      </h1>
      <p className="mt-3 max-w-sm text-sm leading-6 text-zinc-400">
        O endereço acessado não existe nesta versão da plataforma. Verifique o link ou volte ao
        início.
      </p>
      <div className="mt-7 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        <Link
          to="/"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-night-950 transition hover:bg-accent-300"
        >
          <HomeIcon className="size-4" />
          Voltar ao início
        </Link>
        <Link
          to="/dj"
          className="group inline-flex items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/3 px-5 py-3 text-sm font-semibold text-zinc-200 transition hover:bg-white/8"
        >
          Área do DJ
          <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </section>
  )
}
