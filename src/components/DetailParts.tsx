import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { AnimatePresence, LayoutGroup, motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { formatCount, formatRating, tmdbImg, type Person, type Title } from '../lib/catalog'
import { useMyList } from '../lib/myList'
import { useGlassPointer } from '../lib/useGlassPointer'
import { isTV } from '../lib/tv'
import { CheckIcon, ChevronLeft, PlusIcon, StarIcon, TrailerIcon } from './Icons'
import { Img } from './Img'

// Peças comuns às páginas de filme e de série.

/** Paralaxe da arte do topo seguindo a rolagem. */
export function useHeroParallax() {
  const reduce = useReducedMotion()
  // na TV fica parada (recalcular a foto de tela cheia a cada quadro engasga)
  const still = Boolean(reduce) || isTV
  const { scrollY } = useScroll()
  const mediaY = useTransform(scrollY, [0, 900], [0, still ? 0 : 220])
  const mediaScale = useTransform(scrollY, [0, 900], [1, still ? 1 : 1.08])
  const copyOpacity = useTransform(scrollY, [0, 520], [1, still ? 1 : 0.2])
  return { mediaY, mediaScale, copyOpacity }
}

export function BackButton() {
  const navigate = useNavigate()
  const location = useLocation()
  // Entrou direto pelo link? Não há para onde voltar no histórico do app; vai para o início.
  const canGoBack = location.key !== 'default'
  return (
    <button
      type="button"
      className="detail-back btn btn--glass btn--sm glass"
      onClick={() => (canGoBack ? navigate(-1) : navigate('/catalogo', { viewTransition: true }))}
    >
      <ChevronLeft /> {canGoBack ? 'Voltar' : 'Início'}
    </button>
  )
}

export function TrailerButton({ trailer }: { trailer: Title['trailer'] }) {
  const glass = useGlassPointer<HTMLElement>()
  if (!trailer) return null
  return (
    <a
      className="btn btn--glass glass"
      href={`https://www.youtube.com/watch?v=${encodeURIComponent(trailer.key)}`}
      target="_blank"
      rel="noopener noreferrer"
      {...glass}
    >
      <TrailerIcon /> Trailer
    </a>
  )
}

/** "+" / "✓" da Minha lista (aceita slug de filme ou de série). */
export function ListButton({ slug }: { slug: string }) {
  const { has, toggle } = useMyList()
  const glass = useGlassPointer<HTMLElement>()
  const inList = has(slug)
  return (
    <button
      type="button"
      className="btn btn--glass btn--icon glass"
      onClick={() => toggle(slug)}
      aria-pressed={inList}
      aria-label={inList ? 'Remover da Minha lista' : 'Adicionar à Minha lista'}
      {...glass}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={inList ? 'in' : 'out'}
          className="icon-swap"
          initial={{ opacity: 0, scale: 0.4, rotate: inList ? -45 : 45 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          exit={{ opacity: 0, scale: 0.4 }}
          transition={{ type: 'spring', bounce: 0.3, duration: 0.4 }}
        >
          {inList ? <CheckIcon /> : <PlusIcon />}
        </motion.span>
      </AnimatePresence>
    </button>
  )
}

/** Nota do TMDB num anel monocromático. */
export function ScorePanel({ movie }: { movie: Title }) {
  if (movie.rating == null) return null
  const pct = Math.max(0, Math.min(1, movie.rating / 10))
  const r = 30
  const c = 2 * Math.PI * r
  return (
    <aside className="score glass glass--thick" aria-label={`Nota ${formatRating(movie.rating)} de 10 no TMDB`}>
      <div className="score__ring">
        <svg viewBox="0 0 72 72" aria-hidden="true">
          <circle cx="36" cy="36" r={r} className="score__track" />
          <motion.circle
            cx="36"
            cy="36"
            r={r}
            className="score__value"
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: c * (1 - pct) }}
            transition={{ type: 'spring', bounce: 0, duration: 1.4, delay: 0.35 }}
          />
        </svg>
        <span className="score__number">{formatRating(movie.rating)}</span>
      </div>
      <div className="score__text">
        <p className="t-headline">
          <StarIcon /> Nota TMDB
        </p>
        <p className="t-footnote secondary">{formatCount(movie.votes)} avaliações</p>
        {movie.certification && <p className="t-footnote secondary">{certLabel(movie.certification.value)}</p>}
      </div>
    </aside>
  )
}

/** Abas de seção com "lente" deslizante e scroll-spy. */
export function SectionTabs({ sections, label = 'Seções do filme' }: { sections: { id: string; label: string }[]; label?: string }) {
  const [active, setActive] = useState(sections[0]?.id)
  const [stuck, setStuck] = useState(false)
  const sentinel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const els = sections.map(s => document.getElementById(s.id)).filter(Boolean) as HTMLElement[]
    const io = new IntersectionObserver(
      entries => {
        const visible = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActive(visible[0].target.id)
      },
      { rootMargin: '-35% 0px -55% 0px' },
    )
    els.forEach(el => io.observe(el))
    const stick = new IntersectionObserver(([e]) => setStuck(!e.isIntersecting), { rootMargin: '-80px 0px 0px 0px' })
    if (sentinel.current) stick.observe(sentinel.current)
    return () => {
      io.disconnect()
      stick.disconnect()
    }
  }, [sections])

  if (sections.length < 2) return null
  return (
    <>
      <div ref={sentinel} className="section-tabs__sentinel" />
      <div className={`section-tabs ${stuck ? 'is-stuck' : ''}`}>
        <LayoutGroup id="section-tabs">
          <nav className="section-tabs__bar glass no-scrollbar" aria-label={label}>
            {sections.map(s => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="chip filter-chip"
                aria-current={active === s.id ? 'true' : undefined}
                onClick={e => {
                  e.preventDefault()
                  setActive(s.id)
                  document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
              >
                {active === s.id && <motion.span layoutId="section-lens" className="filter-chip__lens" transition={{ type: 'spring', bounce: 0.15, duration: 0.45 }} />}
                <span className="filter-chip__label">{s.label}</span>
              </a>
            ))}
          </nav>
        </LayoutGroup>
      </div>
    </>
  )
}

export function PersonCard({ person }: { person: Person }) {
  const initials = person.name
    .split(/\s+/)
    .map(w => w[0])
    .slice(0, 2)
    .join('')
  return (
    <figure className="person">
      <div className="person__photo">
        {person.profile ? <Img src={tmdbImg(person.profile, 'w185')} alt="" loading="lazy" /> : <span aria-hidden="true">{initials}</span>}
      </div>
      <figcaption>
        <p className="t-footnote person__name">{person.name}</p>
        {person.character && <p className="t-caption tertiary person__role">{person.character}</p>}
      </figcaption>
    </figure>
  )
}

export function CrewItem({ label, people }: { label: string; people: Person[] }) {
  if (!people.length) return null
  return (
    <div className="crew-grid__item">
      <dt className="t-footnote tertiary">{label}</dt>
      <dd className="t-callout">{people.map(p => p.name).join(', ')}</dd>
    </div>
  )
}

export function FactGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="facts__group">
      <h3 className="t-footnote tertiary facts__title">{title}</h3>
      <dl>{children}</dl>
    </div>
  )
}

export function Fact({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="fact">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

export function certLabel(v: string) {
  if (v === 'L') return 'Livre para todos os públicos'
  if (/^\d+$/.test(v)) return `Não recomendado para menores de ${v} anos`
  return v
}
