import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../features/auth/AuthContext'
import { SignOutButton } from '../features/auth/components/SignOutButton'
import './DjProfileMenu.css'

const DESKTOP_MEDIA_QUERY = '(min-width: 601px)'

function subscribeToDesktopMediaQuery(onChange: () => void) {
  const mediaQuery = window.matchMedia?.(DESKTOP_MEDIA_QUERY)
  if (!mediaQuery) return () => {}

  mediaQuery.addEventListener('change', onChange)
  return () => mediaQuery.removeEventListener('change', onChange)
}

function getDesktopSnapshot() {
  return window.matchMedia?.(DESKTOP_MEDIA_QUERY).matches ?? false
}

export function DjProfileMenu() {
  const { profile } = useAuth()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const isDesktop = useSyncExternalStore(subscribeToDesktopMediaQuery, getDesktopSnapshot, () => false)
  const displayName = profile?.displayName ?? 'DJ'

  useEffect(() => {
    if (!open) return

    function closeOnOutsidePointer(event: PointerEvent) {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', closeOnOutsidePointer)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  const menu = (
    <div className="dj-profile-menu-wrap" ref={menuRef}>
      <button
        type="button"
        className="dj-profile-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="dj-profile-menu"
        onClick={() => setOpen((wasOpen) => !wasOpen)}
      >
        <span className="dj-profile-menu-trigger__icon" aria-hidden="true">♫</span>
        <span className="dj-profile-menu-trigger__name">DJ: {displayName}</span>
        <svg className="dj-profile-menu-trigger__chevron" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="m7 10 5 5 5-5" />
        </svg>
      </button>
      {open ? (
        <div id="dj-profile-menu" className="dj-profile-menu" role="menu" aria-label="Menu do perfil">
          <SignOutButton
            label="Sair da conta"
            className="dj-profile-menu__signout"
            onSuccess={() => setOpen(false)}
            role="menuitem"
          />
        </div>
      ) : null}
    </div>
  )

  return isDesktop ? createPortal(menu, document.body) : menu
}
