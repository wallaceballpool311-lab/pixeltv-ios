import { movies, series, isOffline } from '../lib/catalog'

export function Footer() {
  const available = movies.filter(m => m.file.available).length
  return (
    <footer className="footer wrap">
      <div className="footer__rule" />
      <p className="t-footnote tertiary">
        PixelTV · {movies.length} filmes
        {series.length > 0 && ` e ${series.length} ${series.length === 1 ? 'série' : 'séries'}`} no catálogo, {available} filmes prontos no Drive.
      </p>
      <p className="t-caption tertiary">
        {isOffline
          ? 'Catálogo gerado só com os dados do Drive.'
          : 'Metadados e imagens: The Movie Database (TMDB). Este site usa a API do TMDB, mas não é endossado nem certificado pelo TMDB.'}
      </p>
    </footer>
  )
}
