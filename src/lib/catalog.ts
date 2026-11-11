export interface Person {
  id: number
  name: string
  character?: string
  job?: string
  profile: string | null
}

export interface Movie {
  slug: string
  order: number
  tmdbId: number | null
  imdbId: string | null
  title: string
  folderTitle: string
  originalTitle: string | null
  originalLanguage: string | null
  year: number | null
  releaseDate: string | null
  runtime: number | null
  tagline: string | null
  overview: string | null
  genres: string[]
  rating: number | null
  votes: number
  popularity: number
  certification: { country: string; value: string } | null
  status: string | null
  budget: number | null
  revenue: number | null
  countries: string[]
  languages: string[]
  companies: { name: string; logo: string | null }[]
  collection: { id: number; name: string; poster: string | null; backdrop: string | null } | null
  keywords: string[]
  images: {
    poster: string | null
    backdrop: string | null
    backdrops: string[]
    logo: string | null
    logoAspect: number | null
  }
  trailer: { key: string; name: string } | null
  cast: Person[]
  crew: {
    directors: Person[]
    writers: Person[]
    producers: Person[]
    music: Person[]
    photography: Person[]
    editing: Person[]
  }
  recommendations: number[]
  boxset: string | null
  file: { available: boolean; subtitles: string[] }
  quality: Quality | null
  /** estúdios conhecidos (ex.: "Disney e Pixar"); catálogo antigo não tem, e setCatalog completa com [] */
  studios: string[]
  /** "Versão estendida" quando a pasta do Drive diz que é */
  edition: string | null
  kind: 'movie'
}

export interface Quality {
  resolution: '4K' | '1080p' | '720p' | null
  hdr: string | null
  audio: string | null
  codec: string | null
  source: string | null
  dual: boolean
  container: string
}

export interface Episode {
  slug: string
  season: number
  number: number
  title: string
  overview: string | null
  still: string | null
  runtime: number | null
  airDate: string | null
  file: { available: boolean; subtitles: string[] }
  quality: Quality | null
}

export interface Season {
  number: number
  name: string
  overview: string | null
  poster: string | null
  episodes: Episode[]
}

export interface Series {
  kind: 'series'
  slug: string
  tmdbId: number | null
  imdbId: string | null
  title: string
  folderTitle: string
  originalTitle: string | null
  originalLanguage: string | null
  year: number | null
  lastYear: number | null
  releaseDate: string | null
  status: string | null
  tagline: string | null
  overview: string | null
  genres: string[]
  rating: number | null
  votes: number
  popularity: number
  certification: { country: string; value: string } | null
  countries: string[]
  languages: string[]
  companies: { name: string; logo: string | null }[]
  studios: string[]
  anime: boolean
  images: Movie['images']
  trailer: { key: string; name: string } | null
  cast: Person[]
  /** em série, `directors` traz os criadores */
  crew: Movie['crew']
  recommendations: number[]
  seasonCount: number
  episodeCount: number
  /** temporada 0 ("Especiais") vem por último */
  seasons: Season[]
  file: { available: boolean; subtitles: string[] }
  quality: Quality | null
}

/** Filme ou série: o que os cards e a busca mostram. */
export type Title = Movie | Series

export interface Catalog {
  generatedAt: string
  offline?: boolean
  count: number
  movies: Movie[]
  series?: Series[]
  seriesCount?: number
  /** ordem oficial dos estúdios nas prateleiras e nos filtros */
  studios?: string[]
}

// O catálogo chega do servidor quando o app abre (main.tsx chama setCatalog antes de renderizar),
// então filme novo no Drive aparece sem publicar o site de novo. `export let` mantém o vínculo vivo.
export let movies: Movie[] = []
export let series: Series[] = []
export let studioOrder: string[] = []
export let isOffline = false
export let catalogDate = ''

export interface EpisodeRef {
  series: Series
  season: Season
  episode: Episode
}

let bySlug = new Map<string, Movie>()
let byTmdb = new Map<number, Movie>()
let seriesBySlug = new Map<string, Series>()
let episodeBySlug = new Map<string, EpisodeRef>()

export function setCatalog(c: Catalog) {
  // catálogo gerado antes das séries e dos estúdios: completa os campos novos no lugar
  for (const m of c.movies) {
    m.studios ??= []
    m.edition ??= null
    m.kind = 'movie'
  }
  for (const s of c.series ?? []) {
    s.kind = 'series'
    s.studios ??= []
    s.anime = Boolean(s.anime)
    s.seasons ??= []
  }
  movies = c.movies
  series = c.series ?? []
  studioOrder = c.studios ?? []
  isOffline = Boolean(c.offline)
  catalogDate = c.generatedAt
  bySlug = new Map(movies.map(m => [m.slug, m]))
  byTmdb = new Map(movies.filter(m => m.tmdbId).map(m => [m.tmdbId as number, m]))
  seriesBySlug = new Map(series.map(s => [s.slug, s]))
  episodeBySlug = new Map()
  for (const s of series) for (const season of s.seasons) for (const episode of season.episodes) episodeBySlug.set(episode.slug, { series: s, season, episode })
  collectionsCache = null
}

export const getMovie = (slug: string | undefined) => (slug ? bySlug.get(slug) : undefined)
export const getSeries = (slug: string | undefined) => (slug ? seriesBySlug.get(slug) : undefined)
/** Episódio pelo próprio slug, com a série e a temporada. */
export const findEpisode = (slug: string | undefined) => (slug ? episodeBySlug.get(slug) : undefined)

export const isSeries = (t: Title): t is Series => t.kind === 'series'
export const titleHref = (t: Title) => (isSeries(t) ? `/serie/${t.slug}` : `/filme/${t.slug}`)

/* ---------- Episódios ---------- */

/** "T1:E3" (ou "Especial 2" na temporada 0) */
export const episodeCode = (e: Pick<Episode, 'season' | 'number'>) => (e.season === 0 ? `Especial ${e.number}` : `T${e.season}:E${e.number}`)

/** Título que vai para o player nativo: "Dark · T1:E3 · Segredos". */
export const episodeLabel = ({ series, episode }: EpisodeRef) => `${series.title} · ${episodeCode(episode)} · ${episode.title}`

/** Segue na temporada e passa para a seguinte; os especiais não entram no meio das temporadas regulares. */
export function nextEpisode(slug: string): EpisodeRef | null {
  const ref = findEpisode(slug)
  if (!ref) return null
  const { series: s, season, episode } = ref
  const i = season.episodes.indexOf(episode)
  if (i + 1 < season.episodes.length) return { series: s, season, episode: season.episodes[i + 1] }
  if (season.number === 0) return null
  const later = s.seasons.find(x => x.number > season.number && x.episodes.length)
  return later ? { series: s, season: later, episode: later.episodes[0] } : null
}

/**
 * Por onde continuar a série: o episódio com progresso mais recente;
 * sem nenhum, o primeiro da primeira temporada regular (os especiais só se não houver outra).
 */
export function resumePoint(s: Series, progress: Record<string, { t: number; d: number; at: number }>) {
  let best: (EpisodeRef & { progress: { t: number; d: number; at: number } }) | null = null
  for (const season of s.seasons)
    for (const episode of season.episodes) {
      const p = progress[episode.slug]
      if (p && (!best || p.at > best.progress.at)) best = { series: s, season, episode, progress: p }
    }
  if (best) return best
  const season = s.seasons.find(x => x.number > 0 && x.episodes.length) ?? s.seasons.find(x => x.episodes.length)
  return season ? { series: s, season, episode: season.episodes[0], progress: undefined } : null
}

/* ---------- Imagens do TMDB ---------- */

export type ImgSize = 'w92' | 'w154' | 'w185' | 'w300' | 'w342' | 'w500' | 'w780' | 'w1280' | 'h632' | 'original'

export const tmdbImg = (path: string | null | undefined, size: ImgSize) =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : undefined

export const backdropSrcSet = (path: string | null | undefined) =>
  path
    ? [`${tmdbImg(path, 'w780')} 780w`, `${tmdbImg(path, 'w1280')} 1280w`, `${tmdbImg(path, 'original')} 2560w`].join(', ')
    : undefined

export const posterSrcSet = (path: string | null | undefined) =>
  path ? [`${tmdbImg(path, 'w342')} 342w`, `${tmdbImg(path, 'w500')} 500w`, `${tmdbImg(path, 'w780')} 780w`].join(', ') : undefined

/* ---------- Formatação (pt-BR) ---------- */

export function formatRuntime(min: number | null) {
  if (!min) return null
  const h = Math.floor(min / 60)
  const m = min % 60
  return h ? (m ? `${h} h ${m} min` : `${h} h`) : `${m} min`
}

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 })
export const formatMoney = (v: number | null) => (v ? money.format(v) : null)

const date = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
export const formatDate = (iso: string | null) => (iso ? date.format(new Date(iso)) : null)

const count = new Intl.NumberFormat('pt-BR')
export const formatCount = (v: number) => count.format(v)

export const formatRating = (v: number | null) => (v == null ? null : v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }))

/** "Ficção científica · Aventura" — no máximo duas para caber numa linha. */
export const genreLine = (m: Title, max = 2) => m.genres.slice(0, max).join(' · ')

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
export const seasonsLabel = (s: Series) => plural(s.seasonCount || s.seasons.filter(x => x.number > 0).length || 1, 'temporada', 'temporadas')
export const episodesLabel = (n: number) => plural(n, 'episódio', 'episódios')

/** "2017–2020", "2022–" (ainda em exibição) ou só o ano. */
export function seriesYears(s: Series) {
  if (!s.year) return null
  if (s.status === 'Returning Series' || s.status === 'In Production') return `${s.year}–`
  return s.lastYear && s.lastYear !== s.year ? `${s.year}–${s.lastYear}` : String(s.year)
}

// o TMDB manda a situação da série só em inglês
const STATUS: Record<string, string> = {
  'Returning Series': 'Em exibição',
  'In Production': 'Em produção',
  Planned: 'Planejada',
  Ended: 'Encerrada',
  Canceled: 'Cancelada',
  Pilot: 'Piloto',
}
export const seriesStatus = (s: Series) => (s.status ? (STATUS[s.status] ?? null) : null)

export const qualityLabel = (m: Title) => {
  const q = m.quality
  if (!q) return null
  return q.resolution === '4K' ? (q.hdr ? `4K ${q.hdr === 'Dolby Vision' ? 'Dolby Vision' : 'HDR'}` : '4K') : q.resolution
}

/* ---------- Prateleiras ---------- */

export interface Shelf {
  id: string
  title: string
  movies: Title[]
  kind?: 'landscape' | 'poster'
  /** destino do "ver tudo" no título da prateleira */
  href?: string
}

const hasArt = (m: Movie) => Boolean(m.images.backdrop)
const playable = (m: Movie) => m.file.available

/** Destaques do topo: arte completa, arquivo no Drive, os mais novos e populares primeiro. */
export function featured(limit = 7) {
  const pool = movies.filter(m => playable(m) && hasArt(m) && m.overview)
  const source = pool.length >= 3 ? pool : movies.filter(playable)
  return [...source]
    .sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || b.popularity - a.popularity)
    .slice(0, limit)
}

export function genres() {
  const counts = new Map<string, number>()
  for (const m of movies) for (const g of m.genres) counts.set(g, (counts.get(g) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([g]) => g)
}

export function seriesGenres() {
  const counts = new Map<string, number>()
  for (const s of series) for (const g of s.genres) counts.set(g, (counts.get(g) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([g]) => g)
}

const byPopularity = (a: Title, b: Title) => b.popularity - a.popularity

/** Estúdios com ao menos `min` títulos (filmes e séries juntos), na ordem oficial do catálogo. */
export function studios(min = 1, pool: Title[] = [...movies, ...series]) {
  return studioOrder
    .map(name => ({ name, titles: pool.filter(t => t.studios.includes(name)).sort(byPopularity) }))
    .filter(x => x.titles.length >= min)
}

export function homeShelves(): Shelf[] {
  const shelves: Shelf[] = []
  const recent = [...movies].filter(m => (m.year ?? 0) >= 2025).sort((a, b) => (b.releaseDate ?? '').localeCompare(a.releaseDate ?? ''))
  if (recent.length >= 3) shelves.push({ id: 'lancamentos', title: 'Lançamentos', movies: recent })

  const shows = series.filter(s => !s.anime).sort(byPopularity)
  if (shows.length) shelves.push({ id: 'series', title: 'Séries', movies: shows, href: '/series' })
  const anime = series.filter(s => s.anime).sort(byPopularity)
  if (anime.length) shelves.push({ id: 'animes', title: 'Animes', movies: anime, href: '/series?tipo=anime' })

  const uhd = movies.filter(m => m.quality?.resolution === '4K' && playable(m))
  if (uhd.length >= 3) shelves.push({ id: '4k', title: 'Em 4K', movies: uhd })

  const top = movies.filter(m => (m.rating ?? 0) >= 7 && m.votes > 500).sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
  if (top.length >= 4) shelves.push({ id: 'aclamados', title: 'Mais bem avaliados', movies: top.slice(0, 20), kind: 'poster' })

  // filmes e séries do estúdio juntos; o "ver tudo" leva aos filmes dele (se houver algum)
  for (const st of studios(3))
    shelves.push({
      id: `estudio-${st.name}`,
      title: st.name,
      movies: st.titles,
      href: st.titles.some(t => !isSeries(t)) ? `/filmes?estudio=${encodeURIComponent(st.name)}` : undefined,
    })

  for (const g of genres()) {
    const list = movies.filter(m => m.genres.includes(g)).sort((a, b) => b.popularity - a.popularity)
    if (list.length >= 4) shelves.push({ id: `genero-${g}`, title: g, movies: list, href: `/filmes?genero=${encodeURIComponent(g)}` })
  }

  if (!shelves.length) shelves.push({ id: 'todos', title: 'Todos os filmes', movies: [...movies].sort((a, b) => a.order - b.order) })
  return shelves
}

/* ---------- Coleções (boxsets do Drive + coleções do TMDB) ---------- */

export interface Collection {
  id: string
  name: string
  movies: Movie[]
  backdrop: string | null
  poster: string | null
}

let collectionsCache: Collection[] | null = null

export function collections(): Collection[] {
  return (collectionsCache ??= buildCollections())
}

function buildCollections(): Collection[] {
  const groups = new Map<string, Collection>()
  for (const m of movies) {
    // O boxset montado no Drive manda; a coleção do TMDB só agrupa o que está solto.
    const key = m.boxset ? `box-${slugKey(m.boxset)}` : m.collection ? `tmdb-${m.collection.id}` : null
    if (!key) continue
    const name = cleanCollectionName(m.boxset ?? m.collection?.name ?? '')
    const g = groups.get(key) ?? { id: key, name, movies: [], backdrop: null, poster: null }
    g.movies.push(m)
    g.backdrop ??= m.collection?.backdrop ?? null
    g.poster ??= m.collection?.poster ?? null
    groups.set(key, g)
  }
  for (const g of groups.values()) g.backdrop ??= g.movies.find(m => m.images.backdrop)?.images.backdrop ?? null
  return [...groups.values()]
    .filter(g => g.movies.length >= 2)
    .map(g => ({ ...g, movies: g.movies.sort((a, b) => (a.releaseDate ?? String(a.year)).localeCompare(b.releaseDate ?? String(b.year))) }))
    .sort((a, b) => b.movies.length - a.movies.length)
}

const slugKey = (s: string) => fold(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/** "De Volta para o Futuro: Coleção" → "De Volta para o Futuro"; "Homem-Aranha - Trilogia Clássica" fica. */
const cleanCollectionName = (s: string) =>
  s
    .replace(/\s*[:\-–]?\s*(Coleção|Collection)$/i, '')
    .replace(/^(Coleção|Collection)\s+(de\s+)?/i, '')
    .trim()

export function collectionOf(m: Movie) {
  return collections().find(c => c.movies.includes(m)) ?? null
}

/** Recomendações do TMDB que existem no Drive; completa com filmes de gêneros em comum. */
export function related(m: Movie, limit = 12) {
  const out: Movie[] = []
  for (const id of m.recommendations) {
    const r = byTmdb.get(id)
    if (r && r !== m) out.push(r)
  }
  const score = (o: Movie) => o.genres.filter(g => m.genres.includes(g)).length
  const rest = movies
    .filter(o => o !== m && !out.includes(o) && score(o) > 0)
    .sort((a, b) => score(b) - score(a) || b.popularity - a.popularity)
  return [...out, ...rest].slice(0, limit)
}

/* ---------- Busca local (nada sai do navegador) ---------- */

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function search(query: string): Title[] {
  const q = fold(query.trim())
  if (!q) return []
  const scored = [...movies, ...series]
    .map(m => {
      const title = fold(m.title)
      const original = fold(m.originalTitle ?? '')
      let score = 0
      if (title.startsWith(q)) score += 100
      else if (title.includes(q)) score += 60
      if (original.includes(q)) score += 40
      if (m.cast.some(c => fold(c.name).includes(q))) score += 30
      if (m.crew.directors.some(c => fold(c.name).includes(q))) score += 30
      if (m.genres.some(g => fold(g).includes(q))) score += 20
      if (String(m.year) === q) score += 50
      return { m, score }
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score || b.m.popularity - a.m.popularity)
  return scored.map(x => x.m)
}
