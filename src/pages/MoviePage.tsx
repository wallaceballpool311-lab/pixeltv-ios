import { useLayoutEffect, useMemo, useRef } from 'react'
import { useParams } from 'react-router'
import { motion } from 'motion/react'
import { backdropSrcSet, collectionOf, formatDate, formatMoney, formatRuntime, getMovie, related, tmdbImg, type Movie } from '../lib/catalog'
import { readProgress } from '../lib/streamer'
import { morphTo } from '../lib/morph'
import { usePageTitle } from '../lib/usePageTitle'
import { ExternalIcon, PlayIcon } from '../components/Icons'
import { TitleLogo } from '../components/TitleLogo'
import { MetaLine } from '../components/MetaLine'
import { Shelf } from '../components/Shelf'
import { MovieCard, PosterCard } from '../components/MovieCard'
import { Img } from '../components/Img'
import { Footer } from '../components/Footer'
import { usePlay } from '../components/usePlay'
import {
  BackButton,
  certLabel,
  CrewItem,
  Fact,
  FactGroup,
  ListButton,
  PersonCard,
  ScorePanel,
  SectionTabs,
  TrailerButton,
  useHeroParallax,
} from '../components/DetailParts'
import { NotFound } from './NotFound'

export function MoviePage() {
  const { slug } = useParams()
  const movie = getMovie(slug)
  usePageTitle(movie?.title)
  if (!movie) return <NotFound message="Esse filme não está no catálogo." />
  // key: trocar de filme remonta a página inteira (rolagem, parallax e abas zeram juntos)
  return <MovieDetail key={movie.slug} movie={movie} />
}

function MovieDetail({ movie }: { movie: Movie }) {
  const play = usePlay()
  const progress = useMemo(() => readProgress()[movie.slug], [movie.slug])
  const heroImg = useRef<HTMLDivElement>(null)
  const logoRef = useRef<HTMLDivElement>(null)

  // O topo recebe os nomes da transição compartilhada para o morph do card chegar aqui.
  useLayoutEffect(() => morphTo(heroImg.current, logoRef.current), [])

  // paralaxe da arte seguindo a rolagem (parada na TV, ver useHeroParallax)
  const { mediaY, mediaScale, copyOpacity } = useHeroParallax()

  const collection = useMemo(() => collectionOf(movie), [movie])
  const more = useMemo(() => related(movie).filter(m => !collection?.movies.includes(m)), [movie, collection])
  const directors = movie.crew.directors.map(p => p.name)
  const leads = movie.cast.slice(0, 3).map(p => p.name)
  const extraBackdrops = movie.images.backdrops.filter(b => b !== movie.images.backdrop)

  const sections = [
    movie.cast.length > 0 && { id: 'elenco', label: 'Elenco' },
    hasCrew(movie) && { id: 'equipe', label: 'Equipe' },
    { id: 'detalhes', label: 'Detalhes' },
    extraBackdrops.length > 0 && { id: 'imagens', label: 'Imagens' },
    collection && { id: 'colecao', label: 'Coleção' },
    more.length > 0 && { id: 'relacionados', label: 'Relacionados' },
  ].filter(Boolean) as { id: string; label: string }[]

  return (
    <main className="page page--flush detail">
      <section className="detail-hero">
        <motion.div className="detail-hero__media" style={{ y: mediaY, scale: mediaScale }}>
          <div ref={heroImg} className="detail-hero__img">
            {movie.images.backdrop ? (
              <>
                {/* camada base = mesma imagem do card (já em cache), para o morph não piscar */}
                <Img src={tmdbImg(movie.images.backdrop, 'w780')} alt="" fade={false} />
                <Img src={tmdbImg(movie.images.backdrop, 'w1280')} srcSet={backdropSrcSet(movie.images.backdrop)} sizes="100vw" alt="" fetchPriority="high" />
              </>
            ) : (
              <div className="art-fallback" />
            )}
          </div>
        </motion.div>
        <div className="detail-hero__scrim" />

        <BackButton />

        <motion.div className="detail-hero__content wrap" style={{ opacity: copyOpacity }}>
          <div className="detail-hero__copy">
            <div ref={logoRef} className="detail-hero__logo">
              <TitleLogo movie={movie} size="hero" />
            </div>
            <MetaLine movie={movie} genres={3} />
            {movie.tagline && <p className="detail-hero__tagline t-headline">{movie.tagline}</p>}
            {movie.overview && <p className="detail-hero__overview t-body">{movie.overview}</p>}
            <div className="detail-hero__actions">
              <button type="button" className="btn btn--primary" onClick={() => play(movie)} data-autofocus>
                <PlayIcon /> {progress ? 'Continuar' : 'Assistir'}
              </button>
              <TrailerButton trailer={movie.trailer} />
              <ListButton slug={movie.slug} />
            </div>
            {(directors.length > 0 || leads.length > 0) && (
              <dl className="detail-hero__credits t-callout">
                {directors.length > 0 && (
                  <div>
                    <dt>Direção</dt>
                    <dd>{directors.join(', ')}</dd>
                  </div>
                )}
                {leads.length > 0 && (
                  <div>
                    <dt>Elenco</dt>
                    <dd>{leads.join(', ')}</dd>
                  </div>
                )}
              </dl>
            )}
          </div>
          <ScorePanel movie={movie} />
        </motion.div>
      </section>

      <SectionTabs sections={sections} />

      <div className="detail__body">
        {movie.cast.length > 0 && (
          <div id="elenco" className="detail__section">
            <Shelf title="Elenco" kind="person">
              {movie.cast.map(p => (
                <PersonCard key={`${p.id}-${p.character}`} person={p} />
              ))}
            </Shelf>
          </div>
        )}

        {hasCrew(movie) && (
          <section id="equipe" className="detail__section wrap" aria-label="Equipe">
            <h2 className="t-title-2 detail__h2">Equipe</h2>
            <dl className="crew-grid">
              <CrewItem label="Direção" people={movie.crew.directors} />
              <CrewItem label="Roteiro" people={movie.crew.writers} />
              <CrewItem label="Produção" people={movie.crew.producers} />
              <CrewItem label="Música" people={movie.crew.music} />
              <CrewItem label="Fotografia" people={movie.crew.photography} />
              <CrewItem label="Montagem" people={movie.crew.editing} />
            </dl>
          </section>
        )}

        <section id="detalhes" className="detail__section wrap" aria-label="Detalhes">
          <h2 className="t-title-2 detail__h2">Detalhes</h2>
          <div className="facts">
            <FactGroup title="Sobre o filme">
              <Fact label="Título original" value={movie.originalTitle !== movie.title ? movie.originalTitle : null} />
              <Fact label="Lançamento" value={formatDate(movie.releaseDate) ?? (movie.year ? String(movie.year) : null)} />
              <Fact label="Duração" value={formatRuntime(movie.runtime)} />
              <Fact label="Classificação" value={movie.certification ? certLabel(movie.certification.value) : null} />
              <Fact label="Gêneros" value={movie.genres.join(', ') || null} />
              <Fact label="Idiomas" value={movie.languages.join(', ') || null} />
              <Fact label="Países" value={movie.countries.join(', ') || null} />
              <Fact label="Estúdios" value={movie.companies.map(c => c.name).join(', ') || null} />
              <Fact label="Orçamento" value={formatMoney(movie.budget)} />
              <Fact label="Bilheteria" value={formatMoney(movie.revenue)} />
            </FactGroup>
            <FactGroup title="Arquivo no Drive">
              <Fact label="Situação" value={movie.file.available ? 'Pronto para assistir' : 'Ainda não enviado'} />
              <Fact label="Resolução" value={movie.quality?.resolution ?? null} />
              <Fact label="Imagem" value={movie.quality?.hdr ?? (movie.quality?.resolution ? 'SDR' : null)} />
              <Fact label="Áudio" value={[movie.quality?.audio, movie.quality?.dual ? 'Dublado e original' : null].filter(Boolean).join(' · ') || null} />
              <Fact label="Codec" value={movie.quality?.codec ?? null} />
              <Fact label="Origem" value={movie.quality?.source ?? null} />
              <Fact label="Formato" value={movie.quality?.container ?? null} />
              <Fact label="Legendas" value={movie.file.subtitles.join(', ') || null} />
            </FactGroup>
          </div>

          <div className="ext-links">
            {movie.imdbId && (
              <a className="btn btn--glass btn--sm glass" href={`https://www.imdb.com/title/${encodeURIComponent(movie.imdbId)}/`} target="_blank" rel="noopener noreferrer">
                IMDb <ExternalIcon />
              </a>
            )}
            {movie.tmdbId && (
              <a className="btn btn--glass btn--sm glass" href={`https://www.themoviedb.org/movie/${movie.tmdbId}`} target="_blank" rel="noopener noreferrer">
                TMDB <ExternalIcon />
              </a>
            )}
          </div>
        </section>

        {extraBackdrops.length > 0 && (
          <div id="imagens" className="detail__section">
            <Shelf title="Imagens">
              {extraBackdrops.map(b => (
                <a key={b} className="still" href={tmdbImg(b, 'original')} target="_blank" rel="noopener noreferrer" aria-label="Abrir imagem em tamanho original">
                  <Img src={tmdbImg(b, 'w780')} alt="" loading="lazy" />
                </a>
              ))}
            </Shelf>
          </div>
        )}

        {collection && (
          <div id="colecao" className="detail__section">
            <Shelf title={collection.name} kind="poster" seeAll={`/colecoes#${collection.id}`}>
              {collection.movies.map(m => (
                <div key={m.slug} className={m === movie ? 'is-current' : undefined}>
                  <PosterCard movie={m} />
                </div>
              ))}
            </Shelf>
          </div>
        )}

        {more.length > 0 && (
          <div id="relacionados" className="detail__section">
            <Shelf title="Você também pode gostar">
              {more.map(m => (
                <MovieCard key={m.slug} movie={m} />
              ))}
            </Shelf>
          </div>
        )}
      </div>
      <Footer />
    </main>
  )
}

const hasCrew = (m: Movie) => Object.values(m.crew).some(list => list.length > 0)
