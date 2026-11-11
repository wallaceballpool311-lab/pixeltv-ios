import { useMemo } from 'react'
import { Link } from 'react-router'
import { motion, useReducedMotion } from 'motion/react'
import { movies, tmdbImg } from '../lib/catalog'
import { serverConfig } from '../lib/config'
import { usePageTitle } from '../lib/usePageTitle'
import { PosterCard } from '../components/MovieCard'
import { Shelf } from '../components/Shelf'
import {
  ChevronRight,
  DownloadIcon,
  HdrIcon,
  PhoneIcon,
  RefreshIcon,
  RemoteIcon,
  ResumeIcon,
  SpeakerIcon,
  SubtitlesIcon,
  TvIcon,
} from '../components/Icons'

const FEATURES = [
  { icon: HdrIcon, title: 'Qualidade original', text: 'O arquivo do Drive toca do jeito que é: 4K, HDR10 e Dolby Vision, sem recompressão.' },
  { icon: SpeakerIcon, title: 'Som de cinema', text: 'Áudio dublado e original, em 5.1, direto para a TV ou para a sua soundbar.' },
  { icon: SubtitlesIcon, title: 'Legendas', text: 'Em português, inclusive as que vêm dentro do próprio arquivo do filme.' },
  { icon: RefreshIcon, title: 'Sempre atualizado', text: 'Subiu um filme no Drive? Em poucos minutos ele aparece no app, sozinho.' },
  { icon: ResumeIcon, title: 'Continue de onde parou', text: 'A TV lembra o ponto exato em que você parou cada filme.' },
  { icon: RemoteIcon, title: 'Feito para o controle', text: 'Tudo navega pelas setas do controle remoto, com foco grande e claro.' },
]

const rise = {
  hidden: { opacity: 0, y: 24, filter: 'blur(8px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { type: 'spring', bounce: 0, duration: 0.9 } },
} as const

export function Landing() {
  usePageTitle()
  const reduce = useReducedMotion()
  const apk = serverConfig.apk
  const shortUrl = apk.shortUrl || `${location.host}/tv`

  // mural: os pôsteres mais populares, em três faixas que deslizam em sentidos opostos
  const rows = useMemo(() => {
    const pool = movies
      .filter(m => m.images.poster)
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, 33)
    return [0, 1, 2].map(r => pool.filter((_, i) => i % 3 === r))
  }, [])
  const recent = useMemo(
    () => [...movies].filter(m => m.file.available).sort((a, b) => (b.releaseDate ?? '').localeCompare(a.releaseDate ?? '')).slice(0, 16),
    [],
  )
  const fourK = movies.filter(m => m.quality?.resolution === '4K').length

  return (
    <main className="landing">
      <header className="landing__bar wrap">
        <span className="brand" aria-label="PixelTV">
          <span className="brand__mark" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M8 5.2v13.6a1 1 0 0 0 1.53.85l10.7-6.8a1 1 0 0 0 0-1.7L9.53 4.35A1 1 0 0 0 8 5.2Z" fill="currentColor" />
            </svg>
          </span>
          <span className="brand__word">
            Pixel<span>TV</span>
          </span>
        </span>
        <Link to="/catalogo" className="btn btn--glass btn--sm glass">
          Ver catálogo <ChevronRight />
        </Link>
      </header>

      <section className="lhero">
        <div className={`lhero__wall ${reduce ? 'is-still' : ''}`} aria-hidden="true">
          {rows.map((row, r) => (
            <div key={r} className={`lhero__row lhero__row--${r}`}>
              {[...row, ...row].map((m, i) => (
                <img key={`${m.slug}-${i}`} src={tmdbImg(m.images.poster, 'w342')} alt="" loading={i < 8 ? 'eager' : 'lazy'} decoding="async" referrerPolicy="no-referrer" />
              ))}
            </div>
          ))}
        </div>
        <div className="lhero__shade" />

        <motion.div className="lhero__content wrap" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } } }}>
          <motion.div variants={rise} className="app-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M8 5.2v13.6a1 1 0 0 0 1.53.85l10.7-6.8a1 1 0 0 0 0-1.7L9.53 4.35A1 1 0 0 0 8 5.2Z" fill="currentColor" />
            </svg>
          </motion.div>
          <motion.h1 variants={rise} className="lhero__title">
            PixelTV
          </motion.h1>
          <motion.p variants={rise} className="lhero__tagline">
            Seu cinema. Na sua TV.
          </motion.p>
          <motion.p variants={rise} className="lhero__sub">
            Os filmes do seu Drive em qualidade original, com 4K, HDR e áudio 5.1, direto na TV. Sem anúncio e sem mensalidade.
          </motion.p>
          <motion.div variants={rise} className="lhero__cta">
            {apk.available ? (
              <a className="btn btn--primary btn--lg" href={apk.url} download="PixelTV.apk">
                <TvIcon /> Baixar para TV
              </a>
            ) : (
              <span className="btn btn--primary btn--lg is-disabled" aria-disabled="true">
                <TvIcon /> Baixar para TV
              </span>
            )}
            <span className="btn btn--glass btn--lg glass is-disabled" aria-disabled="true">
              <PhoneIcon /> Android <span className="soon">Em breve</span>
            </span>
          </motion.div>
          <motion.p variants={rise} className="lhero__meta t-footnote">
            Android TV · Google TV · Fire TV · TV Box
            {apk.version && ` · versão ${apk.version}`}
            {apk.sizeMB && ` · ${apk.sizeMB} MB`}
          </motion.p>
        </motion.div>
      </section>

      <section className="lsteps wrap" aria-labelledby="como-instalar">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }} variants={{ show: { transition: { staggerChildren: 0.08 } } }}>
          <motion.h2 variants={rise} id="como-instalar" className="t-title-1">
            Instale em três passos.
          </motion.h2>
          <motion.p variants={rise} className="t-body secondary lsteps__lead">
            Pelo próprio controle remoto. Sem cabo e sem computador.
          </motion.p>
          <ol className="lsteps__grid">
            <motion.li variants={rise} className="lstep glass glass--thick">
              <span className="lstep__n">1</span>
              <h3 className="t-headline">Instale o Downloader</h3>
              <p className="t-callout secondary">Na loja da TV (Google Play ou Amazon Appstore), procure por “Downloader” e instale. É grátis.</p>
            </motion.li>
            <motion.li variants={rise} className="lstep glass glass--thick">
              <span className="lstep__n">2</span>
              <h3 className="t-headline">Digite o endereço</h3>
              <code className="lcode">{shortUrl}</code>
              <p className="t-callout secondary">Se a TV perguntar, permita que o Downloader instale apps.</p>
            </motion.li>
            <motion.li variants={rise} className="lstep glass glass--thick">
              <span className="lstep__n">3</span>
              <h3 className="t-headline">Abra a PixelTV</h3>
              <p className="t-callout secondary">Ela aparece junto dos seus apps. Filmes novos chegam sozinhos, sem reinstalar nada.</p>
            </motion.li>
          </ol>
        </motion.div>
      </section>

      <section className="lfeatures wrap" aria-labelledby="recursos">
        <h2 id="recursos" className="t-title-1">
          Feito para a sala de estar.
        </h2>
        <div className="lfeatures__grid">
          {FEATURES.map(f => (
            <motion.div
              key={f.title}
              className="lfeature"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.4 }}
              variants={rise}
            >
              <span className="lfeature__icon">
                <f.icon />
              </span>
              <h3 className="t-headline">{f.title}</h3>
              <p className="t-callout secondary">{f.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {recent.length > 0 && (
        <section className="lcatalog" aria-labelledby="catalogo">
          <div className="wrap lcatalog__head">
            <h2 id="catalogo" className="t-title-1">
              {movies.length} filmes esperando por você.
            </h2>
            <p className="t-body secondary">
              {fourK} em 4K. Novos chegam toda vez que o Drive ganha um filme.
            </p>
          </div>
          <Shelf title="Chegaram há pouco" kind="poster" seeAll="/catalogo">
            {recent.map(m => (
              <PosterCard key={m.slug} movie={m} />
            ))}
          </Shelf>
          <div className="wrap lcatalog__cta">
            <Link to="/catalogo" className="btn btn--glass glass">
              Explorar o catálogo <ChevronRight />
            </Link>
          </div>
        </section>
      )}

      <section className="lfinal wrap">
        <h2 className="t-display">Aperte o play.</h2>
        {apk.available && (
          <a className="btn btn--primary btn--lg" href={apk.url} download="PixelTV.apk">
            <DownloadIcon /> Baixar para TV
          </a>
        )}
      </section>

      <footer className="footer wrap">
        <div className="footer__rule" />
        <p className="t-footnote tertiary">
          PixelTV funciona em aparelhos Android TV, Google TV e Fire TV. TVs Samsung (Tizen) e LG (webOS) não instalam o app; nelas, um Fire TV Stick ou Chromecast resolve.
        </p>
        <p className="t-caption tertiary">Metadados e imagens: The Movie Database (TMDB). Este site usa a API do TMDB, mas não é endossado nem certificado pelo TMDB.</p>
      </footer>
    </main>
  )
}
