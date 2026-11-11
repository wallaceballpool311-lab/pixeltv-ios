import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { backdropSrcSet, formatRating, tmdbImg, type Movie } from '../lib/catalog'
import { useMyList } from '../lib/myList'
import { morphFrom } from '../lib/morph'
import { useGlassPointer } from '../lib/useGlassPointer'
import { CheckIcon, ChevronRight, InfoIcon, PlayIcon, PlusIcon, StarIcon } from './Icons'
import { TitleLogo } from './TitleLogo'
import { MetaLine } from './MetaLine'
import { usePlay } from './usePlay'
import { isTV } from '../lib/tv'

const SLIDE_SECONDS = 9

export function Hero({ movies }: { movies: Movie[] }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const reduce = useReducedMotion()
  const rootRef = useRef<HTMLElement>(null)
  const { has, toggle } = useMyList()
  const play = usePlay()
  const glass = useGlassPointer<HTMLButtonElement>()
  const movie = movies[index]

  const go = useCallback((dir: number) => setIndex(i => (i + dir + movies.length) % movies.length), [movies.length])

  // Pausa quando a aba some, para o carrossel não "andar sozinho" enquanto ninguém olha.
  useEffect(() => {
    const onVis = () => setPaused(document.hidden)
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  // Também pausa com o destaque meio fora da tela: trocar a foto de tela cheia enquanto se navega
  // pelas prateleiras engasgava a rolagem (na TV, principalmente).
  const [offscreen, setOffscreen] = useState(false)
  useEffect(() => {
    const el = rootRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => setOffscreen(e.intersectionRatio < 0.75), { threshold: [0.75] })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  if (!movie) return null
  const inList = has(movie.slug)
  // na TV: sem zoom lento na foto, troca mais curta e texto sem desfoque (filtros animados pesam na GPU da TV)
  const lite = Boolean(reduce) || isTV

  return (
    <section
      ref={rootRef}
      className={`hero ${paused || offscreen ? 'is-paused' : ''}`}
      aria-roledescription="carrossel"
      aria-label="Destaques"
      onPointerEnter={e => e.pointerType === 'mouse' && setPaused(true)}
      onPointerLeave={e => e.pointerType === 'mouse' && setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={e => !e.currentTarget.contains(e.relatedTarget) && setPaused(false)}
      onKeyDown={e => {
        // na TV as setas andam entre os botões; trocar o filme junto fazia o "+" cair no filme seguinte
        if (isTV) return
        if (e.key === 'ArrowRight') go(1)
        if (e.key === 'ArrowLeft') go(-1)
      }}
    >
      <motion.div
        className="hero__stage"
        onPanEnd={(_, info) => {
          // decide pela direção e velocidade do gesto, não só pela distância
          const projected = info.offset.x + info.velocity.x * 0.2
          if (Math.abs(info.offset.y) > Math.abs(info.offset.x)) return
          if (projected < -60) go(1)
          else if (projected > 60) go(-1)
        }}
      >
        <AnimatePresence initial={false}>
          <motion.div
            key={movie.slug}
            className="hero__media"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: isTV ? 0.5 : 1.1, ease: [0.22, 1, 0.36, 1] }}
          >
            {movie.images.backdrop ? (
              <motion.img
                data-morph-backdrop
                className="hero__img"
                src={tmdbImg(movie.images.backdrop, 'w1280')}
                srcSet={backdropSrcSet(movie.images.backdrop)}
                sizes="100vw"
                alt=""
                referrerPolicy="no-referrer"
                draggable={false}
                initial={lite ? false : { scale: 1.08 }}
                animate={{ scale: 1 }}
                transition={{ duration: SLIDE_SECONDS + 2, ease: 'linear' }}
              />
            ) : (
              <div className="art-fallback hero__img" data-morph-backdrop aria-hidden="true">
                <span>{movie.title}</span>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
        <div className="hero__scrim" />
      </motion.div>

      <div className="hero__content wrap">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={movie.slug}
            className="hero__copy"
            initial="out"
            animate="in"
            exit="exit"
            variants={{ in: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } } }}
          >
            <motion.div variants={rise(lite)} className="hero__logo" data-morph-logo>
              <TitleLogo movie={movie} size="hero" />
            </motion.div>
            <motion.div variants={rise(lite)}>
              <MetaLine movie={movie} />
            </motion.div>
            {movie.overview && (
              <motion.p variants={rise(lite)} className="hero__overview t-body">
                {movie.overview}
              </motion.p>
            )}
            {movie.rating != null && (
              <motion.p variants={rise(lite)} className="hero__score t-callout">
                <StarIcon /> {formatRating(movie.rating)} no TMDB
                {movie.crew.directors[0] && <span className="secondary"> · Direção de {movie.crew.directors[0].name}</span>}
              </motion.p>
            )}
            <motion.div variants={rise(lite)} className="hero__actions">
              <button type="button" className="btn btn--primary" onClick={() => play(movie)} data-autofocus>
                <PlayIcon /> Assistir
              </button>
              <button
                type="button"
                className="btn btn--glass btn--icon glass"
                onClick={() => toggle(movie.slug)}
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
              <Link
                to={`/filme/${movie.slug}`}
                className="btn btn--glass btn--icon glass"
                aria-label={`Detalhes de ${movie.title}`}
                viewTransition
                onClick={() => rootRef.current && morphFrom(rootRef.current)}
              >
                <InfoIcon />
              </Link>
              {movies.length > 1 && (
                <button type="button" className="hero__next" onClick={() => go(1)} aria-label="Próximo destaque">
                  <ChevronRight />
                </button>
              )}
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      {movies.length > 1 && (
        <div className="hero__dots glass" role="tablist" aria-label="Escolher destaque">
          {movies.map((m, i) => (
            <button
              key={m.slug}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={m.title}
              className={`hero__dot ${i === index ? 'is-active' : ''}`}
              data-nav-skip
              onClick={() => setIndex(i)}
            >
              {i === index && (
                <span
                  key={`${m.slug}-${index}`}
                  className="hero__dot-fill"
                  style={{ animationDuration: `${SLIDE_SECONDS}s` }}
                  onAnimationEnd={() => go(1)}
                />
              )}
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

function rise(reduce: boolean | null) {
  return {
    out: reduce ? { opacity: 0 } : { opacity: 0, y: 18, filter: 'blur(6px)' },
    in: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { type: 'spring', bounce: 0, duration: 0.7 } },
    exit: { opacity: 0, transition: { duration: 0.18 } },
  } as const
}
