import { formatRuntime, isSeries, seasonsLabel, seriesYears, type Title } from '../lib/catalog'

/**
 * "2026 · Ficção científica · Aventura · 2 h 36 min" + selos de classificação e qualidade.
 * Série: "2017–2020 · 2 temporadas · Crime · Drama".
 */
export function MetaLine({ movie, genres = 2, className = '' }: { movie: Title; genres?: number; className?: string }) {
  const parts = isSeries(movie)
    ? [seriesYears(movie), seasonsLabel(movie), ...movie.genres.slice(0, genres)]
    : [movie.year, ...movie.genres.slice(0, genres), formatRuntime(movie.runtime)]
  const q = movie.quality
  return (
    <div className={`meta-line ${className}`}>
      <span className="meta-line__text">{parts.filter(Boolean).join(' · ')}</span>
      {movie.certification && (
        <span className="badge" title={`Classificação indicativa (${movie.certification.country})`}>
          {movie.certification.value}
        </span>
      )}
      {isSeries(movie) && movie.anime && <span className="badge">Anime</span>}
      {!isSeries(movie) && movie.edition && <span className="badge">{movie.edition}</span>}
      {q?.resolution === '4K' && <span className="badge">4K</span>}
      {q?.hdr && <span className="badge">{q.hdr === 'Dolby Vision' ? 'Dolby Vision' : q.hdr}</span>}
      {q?.audio === 'Dolby Atmos' && <span className="badge">Atmos</span>}
      {!movie.file.available && <span className="badge badge--quiet">Fora do Drive</span>}
    </div>
  )
}
