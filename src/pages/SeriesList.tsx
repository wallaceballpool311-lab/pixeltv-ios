import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { PosterCard } from '../components/MovieCard'
import { FilterChip } from '../components/FilterChip'
import { Footer } from '../components/Footer'
import { series, seriesGenres } from '../lib/catalog'
import { usePageTitle } from '../lib/usePageTitle'

const spring = { type: 'spring', bounce: 0, duration: 0.5 } as const

/** Aba Séries: grade de séries e animes, com filtro único (Todas, Animes ou um gênero). */
export function SeriesList() {
  const [params, setParams] = useSearchParams()
  const anime = params.get('tipo') === 'anime'
  const genre = anime ? null : params.get('genero')
  const allGenres = useMemo(() => seriesGenres(), [])
  usePageTitle(anime ? 'Animes' : (genre ?? 'Séries'))

  const list = useMemo(
    () =>
      series
        .filter(s => !anime || s.anime)
        .filter(s => !genre || s.genres.includes(genre))
        .sort((a, b) => a.title.localeCompare(b.title, 'pt-BR')),
    [anime, genre],
  )

  const choose = (next: { tipo?: string; genero?: string }) => {
    const p = new URLSearchParams()
    if (next.tipo) p.set('tipo', next.tipo)
    if (next.genero) p.set('genero', next.genero)
    setParams(p, { replace: true, preventScrollReset: true })
  }

  const noun = anime ? ['anime', 'animes'] : ['série', 'séries']
  return (
    <main className="page browse">
      <header className="browse__head wrap">
        <h1 className="t-display">{anime ? 'Animes' : (genre ?? 'Séries')}</h1>
        <p className="t-callout secondary">
          {list.length} {list.length === 1 ? noun[0] : noun[1]}
        </p>
      </header>

      {series.length > 0 && (
        <div className="browse__filters">
          <LayoutGroup id="series-filter">
            <div className="filter-bar glass no-scrollbar" role="group" aria-label="Filtrar séries">
              <FilterChip active={!anime && !genre} onClick={() => choose({})} group="series-filter">
                Todas
              </FilterChip>
              {series.some(s => s.anime) && (
                <FilterChip active={anime} onClick={() => choose({ tipo: 'anime' })} group="series-filter">
                  Animes
                </FilterChip>
              )}
              {allGenres.map(g => (
                <FilterChip key={g} active={genre === g} onClick={() => choose({ genero: g })} group="series-filter">
                  {g}
                </FilterChip>
              ))}
            </div>
          </LayoutGroup>
        </div>
      )}

      <motion.ul className="poster-grid wrap" layout transition={spring}>
        <AnimatePresence mode="popLayout" initial={false}>
          {list.map(s => (
            <motion.li
              key={s.slug}
              layout
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={spring}
            >
              <PosterCard movie={s} />
            </motion.li>
          ))}
        </AnimatePresence>
      </motion.ul>
      {list.length === 0 && (
        <p className="browse__empty t-body secondary wrap">{series.length ? 'Nenhuma série com esse filtro.' : 'Ainda não há séries no catálogo.'}</p>
      )}
      <Footer />
    </main>
  )
}
