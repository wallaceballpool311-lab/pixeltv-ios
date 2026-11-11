import { useEffect, useMemo } from 'react'
import { useLocation } from 'react-router'
import { PosterCard } from '../components/MovieCard'
import { Shelf } from '../components/Shelf'
import { Footer } from '../components/Footer'
import { Img } from '../components/Img'
import { backdropSrcSet, collections, tmdbImg } from '../lib/catalog'
import { usePageTitle } from '../lib/usePageTitle'

export function Collections() {
  usePageTitle('Coleções')
  const groups = useMemo(collections, [])
  const { hash } = useLocation()

  useEffect(() => {
    if (!hash) return
    const el = document.getElementById(decodeURIComponent(hash.slice(1)))
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [hash])

  return (
    <main className="page collections">
      <header className="browse__head wrap">
        <h1 className="t-display">Coleções</h1>
        <p className="t-callout secondary">Sagas e boxsets do seu Drive, na ordem de lançamento.</p>
      </header>

      {groups.map(c => {
        const years = c.movies.map(m => m.year).filter(Boolean) as number[]
        const span = years.length ? `${Math.min(...years)}–${Math.max(...years)}` : null
        return (
          <section key={c.id} id={c.id} className="collection">
            <div className="collection__banner wrap">
              <div className="collection__art">
                {c.backdrop ? (
                  <Img src={tmdbImg(c.backdrop, 'w1280')} srcSet={backdropSrcSet(c.backdrop)} sizes="100vw" alt="" loading="lazy" />
                ) : (
                  <div className="art-fallback" />
                )}
                <div className="collection__shade" />
                <div className="collection__copy">
                  <h2 className="t-title-1">{c.name}</h2>
                  <p className="t-callout secondary">
                    {c.movies.length} filmes{span ? ` · ${span}` : ''}
                  </p>
                </div>
              </div>
            </div>
            <Shelf title="Em ordem de lançamento" kind="poster" className="collection__shelf">
              {c.movies.map(m => (
                <PosterCard key={m.slug} movie={m} />
              ))}
            </Shelf>
          </section>
        )
      })}
      {groups.length === 0 && <p className="browse__empty t-body secondary wrap">Nenhuma coleção encontrada no catálogo.</p>}
      <Footer />
    </main>
  )
}
