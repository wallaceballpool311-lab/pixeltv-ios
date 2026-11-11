import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import { motion } from 'motion/react'
import { HomeIcon, FilmIcon, StackIcon, SearchIcon, TvIcon } from './Icons'
import { useGlassPointer } from '../lib/useGlassPointer'

const TABS = [
  { to: '/catalogo', label: 'Início', icon: HomeIcon },
  { to: '/filmes', label: 'Filmes', icon: FilmIcon },
  { to: '/series', label: 'Séries', icon: TvIcon },
  { to: '/colecoes', label: 'Coleções', icon: StackIcon },
]

function activeTab(pathname: string) {
  return TABS.find(t => pathname === t.to || pathname.startsWith(`${t.to}/`))?.to ?? null
}

const lens = { type: 'spring', bounce: 0.18, duration: 0.5 } as const

export function Nav({ onSearch }: { onSearch: () => void }) {
  const { pathname } = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const glass = useGlassPointer<HTMLDivElement>()
  const current = activeTab(pathname)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <header className={`nav ${scrolled ? 'is-scrolled' : ''}`}>
        <Link to="/catalogo" className="brand" aria-label="PixelTV, início" viewTransition>
          <span className="brand__mark" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M8 5.2v13.6a1 1 0 0 0 1.53.85l10.7-6.8a1 1 0 0 0 0-1.7L9.53 4.35A1 1 0 0 0 8 5.2Z" fill="currentColor" />
            </svg>
          </span>
          <span className="brand__word">
            Pixel<span>TV</span>
          </span>
        </Link>

        <nav className="nav__tabs glass" aria-label="Seções" {...glass}>
          {TABS.map(t => (
            <NavLink key={t.to} to={t.to} end className="nav__tab" viewTransition>
              {current === t.to && <motion.span layoutId="nav-lens" className="nav__lens" transition={lens} />}
              <span className="nav__label">{t.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="nav__actions">
          <button type="button" className="btn btn--glass btn--icon btn--sm glass" onClick={onSearch} aria-label="Buscar (atalho: /)">
            <SearchIcon />
          </button>
        </div>
      </header>

      <nav className="tabbar glass glass--thick" aria-label="Seções">
        {TABS.map(t => (
          <NavLink key={t.to} to={t.to} end className="tabbar__item" viewTransition>
            {current === t.to && <motion.span layoutId="tabbar-lens" className="tabbar__lens" transition={lens} />}
            <t.icon />
            <span>{t.label}</span>
          </NavLink>
        ))}
        <button type="button" className="tabbar__item" onClick={onSearch}>
          <SearchIcon />
          <span>Buscar</span>
        </button>
      </nav>
    </>
  )
}
