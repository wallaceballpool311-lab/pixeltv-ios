import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { genreLine, isSeries, movies, search, series, seasonsLabel, titleHref, tmdbImg, type Title } from '../lib/catalog'
import { CloseIcon, SearchIcon } from './Icons'


/** Busca tipo Spotlight: tudo local, nada é enviado para fora do navegador. */
export function SearchSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)
  const navigate = useNavigate()
  const reduce = useReducedMotion()

  const suggestions = useMemo(() => [...movies, ...series].sort((a, b) => b.popularity - a.popularity).slice(0, 6), [])
  const results = useMemo(() => (query.trim() ? search(query).slice(0, 8) : suggestions), [query, suggestions])

  useEffect(() => {
    if (open) {
      returnFocus.current = document.activeElement as HTMLElement
      document.documentElement.style.overflow = 'hidden'
      requestAnimationFrame(() => input.current?.focus())
    } else {
      document.documentElement.style.overflow = ''
      setQuery('')
      setCursor(0)
      returnFocus.current?.focus?.()
    }
  }, [open])

  useEffect(() => setCursor(0), [query])

  const go = (t: Title) => {
    onClose()
    navigate(titleHref(t), { viewTransition: true })
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="search"
          role="dialog"
          aria-modal="true"
          aria-label="Buscar filmes e séries"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onKeyDown={e => {
            if (e.key === 'Escape') onClose()
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setCursor(c => Math.min(c + 1, results.length - 1))
            }
            if (e.key === 'ArrowUp') {
              e.preventDefault()
              setCursor(c => Math.max(c - 1, 0))
            }
            if (e.key === 'Enter' && results[cursor]) go(results[cursor])
            if (e.key === 'Tab') {
              // mantém o foco dentro da folha
              e.preventDefault()
              input.current?.focus()
            }
          }}
        >
          <div className="search__scrim" onClick={onClose} />
          <motion.div
            className="search__panel glass glass--thick"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -24, scale: 0.96, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -16, scale: 0.97, filter: 'blur(8px)' }}
            transition={{ type: 'spring', bounce: 0, duration: 0.42 }}
          >
            <div className="search__field">
              <SearchIcon />
              <input
                ref={input}
                type="search"
                inputMode="search"
                autoComplete="off"
                spellCheck={false}
                placeholder="Filmes, séries, atores, diretores, gêneros"
                value={query}
                onChange={e => setQuery(e.target.value)}
                aria-controls="search-results"
                aria-activedescendant={results[cursor] ? `sr-${results[cursor].slug}` : undefined}
                maxLength={80}
              />
              <button type="button" className="search__close" onClick={onClose} aria-label="Fechar busca">
                <CloseIcon />
              </button>
            </div>
            <p className="search__label t-caption tertiary">{query.trim() ? `${results.length ? 'Resultados' : 'Nada encontrado'}` : 'Populares no seu Drive'}</p>
            <ul id="search-results" className="search__results" role="listbox">
              {results.map((m, i) => (
                <li
                  key={m.slug}
                  id={`sr-${m.slug}`}
                  role="option"
                  aria-selected={i === cursor}
                  className={`search__item ${i === cursor ? 'is-active' : ''}`}
                  onPointerMove={() => setCursor(i)}
                  onClick={() => go(m)}
                >
                  <div className="search__thumb">
                    {m.images.poster ? <img src={tmdbImg(m.images.poster, 'w92')} alt="" referrerPolicy="no-referrer" /> : <div className="art-fallback" />}
                  </div>
                  <div className="search__text">
                    <p className="t-callout search__title">{m.title}</p>
                    <p className="t-footnote tertiary">
                      {(isSeries(m) ? [m.anime ? 'Anime' : 'Série', seasonsLabel(m), genreLine(m, 1)] : [m.year, genreLine(m), m.crew.directors[0]?.name]).filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  {!m.file.available && <span className="badge badge--quiet">Fora do Drive</span>}
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
