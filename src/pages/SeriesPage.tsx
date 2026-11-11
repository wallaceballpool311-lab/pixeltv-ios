import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router'
import { LayoutGroup, motion } from 'motion/react'
import {
  backdropSrcSet,
  episodeCode,
  episodesLabel,
  formatDate,
  formatRuntime,
  getSeries,
  resumePoint,
  seasonsLabel,
  seriesStatus,
  tmdbImg,
  type Episode,
  type Series,
} from '../lib/catalog'
import { readProgress, type Progress } from '../lib/streamer'
import { morphTo } from '../lib/morph'
import { usePageTitle } from '../lib/usePageTitle'
import { isTV } from '../lib/tv'
import { ExternalIcon, PlayIcon } from '../components/Icons'
import { TitleLogo } from '../components/TitleLogo'
import { MetaLine } from '../components/MetaLine'
import { Shelf } from '../components/Shelf'
import { Img } from '../components/Img'
import { Footer } from '../components/Footer'
import { FilterChip } from '../components/FilterChip'
import { usePlay } from '../components/usePlay'
import {
  BackButton,
  certLabel,
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

export function SeriesPage() {
  const { slug } = useParams()
  const show = getSeries(slug)
  usePageTitle(show?.title)
  if (!show) return <NotFound message="Essa série não está no catálogo." />
  // key: trocar de série remonta a página (rolagem, temporada escolhida e abas zeram juntas)
  return <SeriesDetail key={show.slug} show={show} />
}

/** Progresso salvo; relido quando a página volta a ficar visível (o player nativo da TV fica por cima dela). */
function useProgress() {
  const [progress, setProgress] = useState(readProgress)
  useEffect(() => {
    const onVis = () => !document.hidden && setProgress(readProgress())
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('focus', onVis)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('focus', onVis)
    }
  }, [])
  return progress
}

function SeriesDetail({ show }: { show: Series }) {
  const play = usePlay()
  const progress = useProgress()
  const resume = useMemo(() => resumePoint(show, progress), [show, progress])
  const [seasonNo, setSeasonNo] = useState(() => resume?.season.number ?? show.seasons[0]?.number ?? 1)
  const season = show.seasons.find(s => s.number === seasonNo) ?? show.seasons[0]
  const heroImg = useRef<HTMLDivElement>(null)
  const logoRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => morphTo(heroImg.current, logoRef.current), [])
  const { mediaY, mediaScale, copyOpacity } = useHeroParallax()

  const creators = show.crew.directors.map(p => p.name)
  const leads = show.cast.slice(0, 3).map(p => p.name)
  const sections = useMemo(
    () =>
      [
        show.seasons.length > 0 && { id: 'episodios', label: 'Episódios' },
        show.cast.length > 0 && { id: 'elenco', label: 'Elenco' },
        { id: 'detalhes', label: 'Detalhes' },
      ].filter(Boolean) as { id: string; label: string }[],
    [show],
  )

  return (
    <main className="page page--flush detail">
      <section className="detail-hero">
        <motion.div className="detail-hero__media" style={{ y: mediaY, scale: mediaScale }}>
          <div ref={heroImg} className="detail-hero__img">
            {show.images.backdrop ? (
              <>
                {/* camada base = mesma imagem do card (já em cache), para o morph não piscar */}
                <Img src={tmdbImg(show.images.backdrop, 'w780')} alt="" fade={false} />
                <Img src={tmdbImg(show.images.backdrop, 'w1280')} srcSet={backdropSrcSet(show.images.backdrop)} sizes="100vw" alt="" fetchPriority="high" />
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
              <TitleLogo movie={show} size="hero" />
            </div>
            <MetaLine movie={show} genres={3} />
            {show.tagline && <p className="detail-hero__tagline t-headline">{show.tagline}</p>}
            {show.overview && <p className="detail-hero__overview t-body">{show.overview}</p>}
            <div className="detail-hero__actions">
              {resume && (
                <button type="button" className="btn btn--primary" onClick={() => play(resume.episode)} data-autofocus>
                  <PlayIcon /> {resume.progress ? 'Continuar' : 'Assistir'} {episodeCode(resume.episode)}
                </button>
              )}
              <TrailerButton trailer={show.trailer} />
              <ListButton slug={show.slug} />
            </div>
            {(creators.length > 0 || leads.length > 0) && (
              <dl className="detail-hero__credits t-callout">
                {creators.length > 0 && (
                  <div>
                    <dt>Criação</dt>
                    <dd>{creators.join(', ')}</dd>
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
          <ScorePanel movie={show} />
        </motion.div>
      </section>

      <SectionTabs sections={sections} label="Seções da série" />

      <div className="detail__body">
        {season && (
          <div id="episodios" className="detail__section">
            <Shelf
              title="Episódios"
              className="episodes"
              aside={
                show.seasons.length > 1 ? (
                  <LayoutGroup id="season">
                    <div className="filter-bar glass no-scrollbar episodes__seasons" role="group" aria-label="Temporada">
                      {show.seasons.map(s => (
                        <FilterChip key={s.number} active={s.number === season.number} onClick={() => setSeasonNo(s.number)} group="season">
                          {s.name}
                        </FilterChip>
                      ))}
                    </div>
                  </LayoutGroup>
                ) : (
                  <p className="t-callout tertiary">{season.name}</p>
                )
              }
            >
              {season.episodes.map(e => (
                <EpisodeCard
                  key={e.slug}
                  episode={e}
                  show={show}
                  progress={progress[e.slug]}
                  current={Boolean(resume?.progress) && e === resume?.episode}
                  onPlay={() => play(e)}
                />
              ))}
            </Shelf>
            <ScrollToCurrent dep={season.number} />
          </div>
        )}

        {show.cast.length > 0 && (
          <div id="elenco" className="detail__section">
            <Shelf title="Elenco" kind="person">
              {show.cast.map(p => (
                <PersonCard key={`${p.id}-${p.character}`} person={p} />
              ))}
            </Shelf>
          </div>
        )}

        <section id="detalhes" className="detail__section wrap" aria-label="Detalhes">
          <h2 className="t-title-2 detail__h2">Detalhes</h2>
          <div className="facts">
            <FactGroup title="Sobre a série">
              <Fact label="Título original" value={show.originalTitle !== show.title ? show.originalTitle : null} />
              <Fact label="Estreia" value={formatDate(show.releaseDate) ?? (show.year ? String(show.year) : null)} />
              <Fact label="Situação" value={seriesStatus(show)} />
              <Fact label="Temporadas" value={seasonsLabel(show)} />
              <Fact label="Classificação" value={show.certification ? certLabel(show.certification.value) : null} />
              <Fact label="Gêneros" value={show.genres.join(', ') || null} />
              <Fact label="Idiomas" value={show.languages.join(', ') || null} />
              <Fact label="Países" value={show.countries.join(', ') || null} />
              <Fact label="Estúdios" value={show.companies.map(c => c.name).join(', ') || null} />
            </FactGroup>
            <FactGroup title="Arquivos no Drive">
              <Fact label="Situação" value={show.file.available ? 'Pronta para assistir' : 'Ainda não enviada'} />
              <Fact label="Episódios" value={show.episodeCount ? episodesLabel(show.episodeCount) : null} />
              <Fact label="Resolução" value={show.quality?.resolution ?? null} />
              <Fact label="Áudio" value={[show.quality?.audio, show.quality?.dual ? 'Dublado e original' : null].filter(Boolean).join(' · ') || null} />
              <Fact label="Legendas" value={show.file.subtitles.join(', ') || null} />
            </FactGroup>
          </div>

          <div className="ext-links">
            {show.imdbId && (
              <a className="btn btn--glass btn--sm glass" href={`https://www.imdb.com/title/${encodeURIComponent(show.imdbId)}/`} target="_blank" rel="noopener noreferrer">
                IMDb <ExternalIcon />
              </a>
            )}
            {show.tmdbId && (
              <a className="btn btn--glass btn--sm glass" href={`https://www.themoviedb.org/tv/${show.tmdbId}`} target="_blank" rel="noopener noreferrer">
                TMDB <ExternalIcon />
              </a>
            )}
          </div>
        </section>
      </div>
      <Footer />
    </main>
  )
}

/**
 * A cada temporada: leva o episódio de onde continuar para o começo da prateleira, ou volta ao primeiro
 * (sem mexer na rolagem da página). A prateleira não é remontada para o foco do controle ficar no chip da temporada.
 */
function ScrollToCurrent({ dep }: { dep: number }) {
  useEffect(() => {
    const track = document.querySelector<HTMLElement>('#episodios .shelf__track')
    if (!track) return
    const el = track.querySelector<HTMLElement>('[data-current]')
    const pad = parseFloat(getComputedStyle(track).paddingLeft) || 0
    track.scrollLeft = el ? track.scrollLeft + el.getBoundingClientRect().left - track.getBoundingClientRect().left - pad : 0
  }, [dep])
  return null
}

function EpisodeCard({
  episode: e,
  show,
  progress,
  current,
  onPlay,
}: {
  episode: Episode
  show: Series
  progress?: Progress
  current: boolean
  onPlay: () => void
}) {
  const left = progress?.d ? Math.max(0, Math.round((progress.d - progress.t) / 60)) : null
  const meta = [formatRuntime(e.runtime), left != null && `Faltam ${left} min`].filter(Boolean).join(' · ')
  // na TV a foto do episódio vem pequena (w300 cobre o card); no computador, a original para telas densas
  const still = e.still ? tmdbImg(e.still, 'w300') : tmdbImg(show.images.backdrop, 'w780')
  return (
    <button
      type="button"
      className={`card episode ${current ? 'is-current' : ''}`}
      onClick={onPlay}
      data-current={current || undefined}
      aria-label={`${e.season === 0 ? 'Especial' : 'Episódio'} ${e.number}, ${e.title}${meta ? `, ${meta}` : ''}`}
    >
      <div className="card__art">
        {still ? (
          <Img
            className="card__img"
            src={still}
            srcSet={e.still && !isTV ? `${tmdbImg(e.still, 'w300')} 300w, ${tmdbImg(e.still, 'original')} 1280w` : undefined}
            sizes="(max-width: 720px) 62vw, (max-width: 1100px) 33vw, 25vw"
            alt=""
            loading="lazy"
          />
        ) : (
          <div className="art-fallback card__img" />
        )}
        <div className="card__shade" />
        <span className="episode__play" aria-hidden="true">
          <PlayIcon />
        </span>
        {!e.file.available && (
          <div className="card__badges">
            <span className="badge badge--glass">Em breve</span>
          </div>
        )}
        {progress && progress.d > 0 && (
          <span className="card__progress" aria-hidden="true">
            <span style={{ transform: `scaleX(${Math.min(1, progress.t / progress.d)})` }} />
          </span>
        )}
        <span className="card__shine" aria-hidden="true" />
      </div>
      <div className="card__caption">
        <p className="t-footnote card__title">
          {e.season === 0 ? `Especial ${e.number}` : `E${e.number}`} · {e.title}
        </p>
        {meta && <p className="t-caption tertiary episode__meta">{meta}</p>}
        {e.overview && <p className="t-caption secondary episode__overview">{e.overview}</p>}
      </div>
    </button>
  )
}
