import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { PosterCard } from '../components/MovieCard'
import { FilterChip } from '../components/FilterChip'
import { Footer } from '../components/Footer'
import { genres, movies, studios, type Movie } from '../lib/catalog'
import { usePageTitle } from '../lib/usePageTitle'

const SORTS = {
  az: { label: 'A–Z', fn: (a: Movie, b: Movie) => a.title.localeCompare(b.title, 'pt-BR') },
  recentes: { label: 'Mais recentes', fn: (a: Movie, b: Movie) => (b.releaseDate ?? String(b.year)).localeCompare(a.releaseDate ?? String(a.year)) },
  nota: { label: 'Melhor nota', fn: (a: Movie, b: Movie) => (b.rating ?? 0) - (a.rating ?? 0) },
} as const
type SortKey = keyof typeof SORTS

const spring = { type: 'spring', bounce: 0, duration: 0.5 } as const

export function Browse() {
  usePageTitle('Filmes')
  const [params, setParams] = useSearchParams()
  const genre = params.get('genero')
  const studio = params.get('estudio')
  const sort = (params.get('ordem') as SortKey) in SORTS ? (params.get('ordem') as SortKey) : 'az'
  const onlyReady = params.get('disponiveis') === '1'
  const allGenres = useMemo(genres, [])
  // só estúdios com filme (os de série ficam na aba Séries)
  const allStudios = useMemo(() => studios(1, movies).map(s => s.name), [])

  const list = useMemo(
    () =>
      movies
        .filter(m => !genre || m.genres.includes(genre))
        .filter(m => !studio || m.studios.includes(studio))
        .filter(m => !onlyReady || m.file.available)
        .sort(SORTS[sort].fn),
    [genre, studio, sort, onlyReady],
  )

  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(params)
    if (value == null) next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true, preventScrollReset: true })
  }

  return (
    <main className="page browse">
      <header className="browse__head wrap">
        <h1 className="t-display">{[studio, genre].filter(Boolean).join(' · ') || 'Filmes'}</h1>
        <p className="t-callout secondary">
          {list.length} {list.length === 1 ? 'filme' : 'filmes'}
          {onlyReady ? ' prontos para assistir' : ''}
        </p>
      </header>

      <div className="browse__filters">
        <LayoutGroup id="genre">
          <div className="filter-bar glass no-scrollbar" role="group" aria-label="Gênero">
            <FilterChip active={!genre} onClick={() => set('genero', null)} group="genre">
              Todos
            </FilterChip>
            {allGenres.map(g => (
              <FilterChip key={g} active={genre === g} onClick={() => set('genero', g)} group="genre">
                {g}
              </FilterChip>
            ))}
          </div>
        </LayoutGroup>
        <LayoutGroup id="sort">
          <div className="filter-bar filter-bar--compact glass" role="group" aria-label="Ordenar">
            {(Object.keys(SORTS) as SortKey[]).map(k => (
              <FilterChip key={k} active={sort === k} onClick={() => set('ordem', k === 'az' ? null : k)} group="sort">
                {SORTS[k].label}
              </FilterChip>
            ))}
          </div>
        </LayoutGroup>
        <button type="button" className="toggle" role="switch" aria-checked={onlyReady} onClick={() => set('disponiveis', onlyReady ? null : '1')}>
          <span className="toggle__track">
            <span className="toggle__thumb" />
          </span>
          <span className="t-callout">Só os que estão no Drive</span>
        </button>
      </div>

      {allStudios.length > 0 && (
        <div className="browse__studios">
          <LayoutGroup id="studio">
            <div className="filter-bar glass no-scrollbar" role="group" aria-label="Estúdio">
              <FilterChip active={!studio} onClick={() => set('estudio', null)} group="studio">
                Todos os estúdios
              </FilterChip>
              {allStudios.map(name => (
                <FilterChip key={name} active={studio === name} onClick={() => set('estudio', name)} group="studio">
                  {name}
                </FilterChip>
              ))}
            </div>
          </LayoutGroup>
        </div>
      )}

      <motion.ul className="poster-grid wrap" layout transition={spring}>
        <AnimatePresence mode="popLayout" initial={false}>
          {list.map(m => (
            <motion.li
              key={m.slug}
              layout
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={spring}
            >
              <PosterCard movie={m} />
            </motion.li>
          ))}
        </AnimatePresence>
      </motion.ul>
      {list.length === 0 && <p className="browse__empty t-body secondary wrap">Nenhum filme com esse filtro.</p>}
      <Footer />
    </main>
  )
}
