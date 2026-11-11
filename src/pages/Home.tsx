import { useMemo } from 'react'
import { Hero } from '../components/Hero'
import { Shelf } from '../components/Shelf'
import { MovieCard, PosterCard } from '../components/MovieCard'
import { CollectionCard } from '../components/CollectionCard'
import { Footer } from '../components/Footer'
import { collections, featured, findEpisode, getMovie, getSeries, homeShelves, type Episode, type Title } from '../lib/catalog'
import { useMyList } from '../lib/myList'
import { usePageTitle } from '../lib/usePageTitle'
import { readProgress, type Progress } from '../lib/streamer'

interface Watching {
  title: Title
  p: Progress
  /** série: o episódio em andamento mais recente, que o card toca */
  episode?: Episode
}

/** Filmes e séries em andamento, do mais recente; cada série aparece uma vez só. */
function inProgress(): Watching[] {
  const out: Watching[] = []
  const seen = new Set<string>()
  for (const [slug, p] of Object.entries(readProgress()).sort((a, b) => b[1].at - a[1].at)) {
    const movie = getMovie(slug)
    if (movie) {
      if (movie.file.available) out.push({ title: movie, p })
      continue
    }
    const ep = findEpisode(slug)
    if (!ep?.episode.file.available || seen.has(ep.series.slug)) continue
    seen.add(ep.series.slug)
    out.push({ title: ep.series, p, episode: ep.episode })
  }
  return out
}

export function Home() {
  usePageTitle()
  const hero = useMemo(() => featured(), [])
  const shelves = useMemo(homeShelves, [])
  const groups = useMemo(collections, [])
  const { list } = useMyList()
  const mine = list.map(slug => getMovie(slug) ?? getSeries(slug)).filter((m): m is Title => Boolean(m))
  const watching = useMemo(inProgress, [])
  // Coleções entram depois de "Em 4K" (ou da segunda prateleira, se ela não existir)
  const collectionsAt = Math.max(shelves.findIndex(s => s.id === '4k'), 1)

  return (
    <main className="page page--flush home">
      <Hero movies={hero} />
      <div className="home__shelves">
        {watching.length > 0 && (
          <Shelf title="Continuar assistindo">
            {watching.map(({ title, p, episode }) => (
              <MovieCard key={title.slug} movie={title} progress={p} episode={episode} eager />
            ))}
          </Shelf>
        )}
        {mine.length > 0 && (
          <Shelf title="Minha lista">
            {mine.map(m => (
              <MovieCard key={m.slug} movie={m} />
            ))}
          </Shelf>
        )}
        {shelves.map((s, i) => (
          <div key={s.id} className="home__group">
            <Shelf title={s.title} kind={s.kind} seeAll={s.href}>
              {s.movies.map((m, j) =>
                s.kind === 'poster' ? <PosterCard key={m.slug} movie={m} rank={j < 10 ? j + 1 : undefined} /> : <MovieCard key={m.slug} movie={m} eager={i === 0 && j < 5} />,
              )}
            </Shelf>
            {i === collectionsAt && groups.length > 0 && (
              <Shelf title="Coleções" seeAll="/colecoes">
                {groups.map(c => (
                  <CollectionCard key={c.id} collection={c} />
                ))}
              </Shelf>
            )}
          </div>
        ))}
      </div>
      <Footer />
    </main>
  )
}
