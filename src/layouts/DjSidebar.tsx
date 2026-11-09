import type { ReactNode } from 'react'
import './DjSidebar.css'

interface DjSidebarProps {
  brand: ReactNode
  children: ReactNode
  decoration?: ReactNode
  label?: string
}

export function DjSidebar({
  brand,
  children,
  decoration,
  label = 'Navegação do painel',
}: DjSidebarProps) {
  return (
    <aside aria-label={label} className="dj-sidebar-shell">
      <div className="dj-sidebar-shell__brand">{brand}</div>
      <div className="dj-sidebar-shell__navigation">
        <p className="dj-nav-label dj-sidebar-shell__title">PAINEL DO DJ</p>
        <nav className="dj-nav" aria-label={label}>
          {children}
        </nav>
      </div>
      {decoration}
    </aside>
  )
}
