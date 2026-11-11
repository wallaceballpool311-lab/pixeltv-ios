import { Link } from 'react-router'
import { episodeCode, genreLine, isSeries, posterSrcSet, seasonsLabel, titleHref, tmdbImg, formatRating, type Episode, type Title } from '../lib/catalog'
import { morphFrom } from '../lib/morph'
import { Img } from './Img'
import { TitleLogo } from './TitleLogo'
import { StarIcon } from './Icons'
import { usePlay } from './usePlay'

function timeLeft(p: { t: number; d: number }) {
  const left = Math.max(0, Math.round((p.d - p.t) / 60))
  return left >= 60 ? `Faltam ${Math.floor(left / 60)} h ${left % 60} min` : `Faltam ${left} min`
}

/**
 * Card em paisagem (16:9): arte de fundo + logo do título, como as prateleiras da Apple TV.
 * Serve para filme e série; com `episode` (série em "Continuar assistindo"), o clique toca aquele episódio.
 */
export function MovieCard({
  movie,
  eager = false,
  progress,
  episode,
}: {
  movie: Title
  eager?: boolean
  progress?: { t: number; d: number }
  episode?: Episode
}) {
  const series = isSeries(movie)
  const caption = progress
    ? [episode && episodeCode(episode), timeLeft(progress)].filter(Boolean).join(' · ')
    : [genreLine(movie, 1), series ? seasonsLabel(movie) : movie.year].filter(Boolean).join(' · ')
  const target = episode ?? (series ? null : movie)
  const play = usePlay()
  return (
    <Link
      to={titleHref(movie)}
      className="card"
      viewTransition
      onClick={e => {
        // "Continuar assistindo" vai direto para o player (nativo na TV)
        if (progress && target) {
          e.preventDefault()
          return play(target)
        }
        morphFrom(e.currentTarget)
      }}
      aria-label={[movie.title, episode ? `${episodeCode(episode)}, ${episode.title}` : movie.year].filter(Boolean).join(', ')}
    >
      <div className="card__art">
        {movie.images.backdrop ? (
          <Img
            data-morph-backdrop
            className="card__img"
            src={tmdbImg(movie.images.backdrop, 'w780')}
            srcSet={`${tmdbImg(movie.images.backdrop, 'w780')} 780w, ${tmdbImg(movie.images.backdrop, 'w1280')} 1280w`}
            sizes="(max-width: 720px) 62vw, (max-width: 1100px) 33vw, 25vw"
            alt=""
            loading={eager ? 'eager' : 'lazy'}
          />
        ) : (
          <div className="art-fallback card__img" data-morph-backdrop />
        )}
        <div className="card__shade" />
        <div className="card__logo" data-morph-logo>
          <TitleLogo movie={movie} />
        </div>
        <CardBadges movie={movie} />
        {progress && progress.d > 0 && (
          <span className="card__progress" aria-hidden="true">
            <span style={{ transform: `scaleX(${Math.min(1, progress.t / progress.d)})` }} />
          </span>
        )}
        <span className="card__shine" aria-hidden="true" />
      </div>
      {caption && <p className="card__caption t-footnote tertiary">{caption}</p>}
    </Link>
  )
}

function CardBadges({ movie, poster = false }: { movie: Title; poster?: boolean }) {
  const anime = isSeries(movie) && movie.anime
  const uhd = !poster && movie.quality?.resolution === '4K'
  const soon = !movie.file.available
  if (!anime && !uhd && !soon) return null
  return (
    <div className="card__badges">
      {anime && <span className="badge badge--glass">Anime</span>}
      {uhd && <span className="badge badge--glass">4K</span>}
      {soon && <span className="badge badge--glass">Em breve</span>}
    </div>
  )
}

/** Card em pé (2:3) com o pôster. */
export function PosterCard({ movie, eager = false, rank }: { movie: Title; eager?: boolean; rank?: number }) {
  return (
    <Link
      to={titleHref(movie)}
      className="card card--poster"
      viewTransition
      aria-label={`${movie.title}${movie.year ? `, ${movie.year}` : ''}`}
    >
      <div className="card__art">
        {movie.images.poster ? (
          <Img
            className="card__img"
            src={tmdbImg(movie.images.poster, 'w342')}
            srcSet={posterSrcSet(movie.images.poster)}
            sizes="(max-width: 720px) 38vw, (max-width: 1100px) 20vw, 14vw"
            alt=""
            loading={eager ? 'eager' : 'lazy'}
          />
        ) : (
          <div className="art-fallback card__img">
            <span>{movie.title}</span>
          </div>
        )}
        {rank != null && <span className="card__rank">{rank}</span>}
        <CardBadges movie={movie} poster />
        <span className="card__shine" aria-hidden="true" />
      </div>
      <div className="card__caption">
        <p className="t-footnote card__title">{movie.title}</p>
        <p className="t-caption tertiary card__sub">
          {isSeries(movie) ? seasonsLabel(movie) : movie.year}
          {movie.rating != null && (
            <>
              {' · '}
              <StarIcon className="card__star" /> {formatRating(movie.rating)}
            </>
          )}
        </p>
      </div>
    </Link>
  )
}
