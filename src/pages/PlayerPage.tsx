import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { backdropSrcSet, episodeCode, findEpisode, getMovie, tmdbImg, type Movie } from '../lib/catalog'
import { Streamer, capabilities, capsQuery, mseSupported, readProgress, saveProgress, type PlayInfo } from '../lib/streamer'
import { usePageTitle } from '../lib/usePageTitle'
import { TitleLogo } from '../components/TitleLogo'
import {
  CheckIcon,
  ChevronLeft,
  FullscreenIcon,
  GaugeIcon,
  PauseIcon,
  PipIcon,
  PlayIcon,
  QualityIcon,
  ReplayIcon,
  SkipIcon,
  SubtitlesIcon,
  VolumeIcon,
} from '../components/Icons'
import { NotFound } from './NotFound'

const SKIP = 5
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]
const SUB_SIZES = [
  { value: 'p', label: 'Pequena' },
  { value: 'm', label: 'Média' },
  { value: 'g', label: 'Grande' },
] as const

/* ---------- preferências (só neste navegador) ---------- */

interface Prefs {
  rate?: number
  volume?: number
  muted?: boolean
  audioLang?: string
  subLang?: 'off' | 'on'
  subSize?: 'p' | 'm' | 'g'
}
const PREFS_KEY = 'hit-tv:player'
function prefs(): Prefs {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') ?? {}
  } catch {
    return {}
  }
}
function savePrefs(patch: Prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ ...prefs(), ...patch }))
  } catch {
    /* sem armazenamento */
  }
}

/* ---------- formatação ---------- */

function clock(s: number) {
  if (!Number.isFinite(s) || s < 0) s = 0
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`
}
const speedLabel = (r: number) => (r === 1 ? 'Normal' : `${r.toLocaleString('pt-BR')}×`)
const qualityName = (h: number) => (h >= 2160 ? '4K' : `${h}p`)

function pickAudio(info: PlayInfo) {
  const want = prefs().audioLang
  const byLang = (l?: string) => (l ? info.audio.find(a => a.lang === l) : undefined)
  return (byLang(want) ?? byLang('por') ?? info.audio.find(a => a.default) ?? info.audio[0])?.index ?? 0
}

/** Áudio em português → legenda forçada (se houver). Áudio estrangeiro → legenda completa. */
function pickSubtitle(info: PlayInfo, audioIndex: number) {
  if (prefs().subLang === 'off') return -1
  const lang = info.audio.find(a => a.index === audioIndex)?.lang
  const forced = info.subtitles.find(s => /forçada/i.test(s.label))
  const full = info.subtitles.find(s => !/forçada/i.test(s.label))
  if (lang === 'por') return forced?.index ?? -1
  return (full ?? forced)?.index ?? -1
}

/* ---------- página ---------- */

/** O que o player precisa saber de um filme ou de um episódio (os dois tocam pelo próprio slug). */
interface PlayerItem {
  slug: string
  /** nome grande: o filme ou a série */
  title: string
  /** "2024 · Ação" ou "T1:E3 · Segredos" */
  subtitle: string
  images: Movie['images']
  /** para onde o Voltar leva */
  back: string
  noun: 'filme' | 'episódio'
}

function playerItem(slug: string | undefined): PlayerItem | null {
  const m = getMovie(slug)
  if (m) return { slug: m.slug, title: m.title, subtitle: [m.year, m.genres[0]].filter(Boolean).join(' · '), images: m.images, back: `/filme/${m.slug}`, noun: 'filme' }
  const ep = findEpisode(slug)
  if (!ep) return null
  const { series, episode } = ep
  return { slug: episode.slug, title: series.title, subtitle: `${episodeCode(episode)} · ${episode.title}`, images: series.images, back: `/serie/${series.slug}`, noun: 'episódio' }
}

export function PlayerPage() {
  const { slug } = useParams()
  const movie = playerItem(slug)
  usePageTitle(movie ? movie.title : undefined)
  if (!movie) return <NotFound message="Esse título não está no catálogo." />
  return <Player key={movie.slug} movie={movie} />
}

type Menu = null | 'audio' | 'quality' | 'speed'

function Player({ movie }: { movie: PlayerItem }) {
  const navigate = useNavigate()
  const reduce = useReducedMotion()
  const rootRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamerRef = useRef<Streamer | null>(null)
  const capsQ = useMemo(() => capsQuery(capabilities()), [])

  const saved = useMemo(() => readProgress()[movie.slug], [movie.slug])
  const startAt = useRef(saved?.t ?? 0)
  const wantPlay = useRef(true)
  const audioRef = useRef<number | null>(null)

  // sempre começa no original: converter é opção pontual (internet lenta), não regra
  const [quality, setQuality] = useState('original')
  const [info, setInfo] = useState<PlayInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [audio, setAudio] = useState<number | null>(null)
  const [sub, setSub] = useState(-1)
  const [subSize, setSubSize] = useState(() => prefs().subSize ?? 'm')
  const [paused, setPaused] = useState(true)
  const [waiting, setWaiting] = useState(true)
  const [started, setStarted] = useState(false)
  const [ended, setEnded] = useState(false)
  const [rate, setRate] = useState(() => prefs().rate ?? 1)
  const [volume, setVolume] = useState(() => prefs().volume ?? 1)
  const [muted, setMuted] = useState(() => prefs().muted ?? false)
  const [fullscreen, setFullscreen] = useState(false)
  const [idle, setIdle] = useState(false)
  const [menu, setMenu] = useState<Menu>(null)
  const [osd, setOsd] = useState<{ id: number; text: string; icon?: ReactNode } | null>(null)
  const [time, setTime] = useState(startAt.current)
  const [resumeHint, setResumeHint] = useState(Boolean(saved && saved.t > 30))

  const duration = info?.duration ?? 0
  const video = () => videoRef.current

  /* ----- informações do arquivo (recarrega ao trocar a qualidade) ----- */
  useEffect(() => {
    let alive = true
    setError(null)
    fetch(`/api/play/${encodeURIComponent(movie.slug)}/info?${capsQ}&q=${encodeURIComponent(quality)}`, { credentials: 'same-origin' })
      .then(async r => {
        const j = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(j.error || `Não foi possível abrir o ${movie.noun}.`)
        return j as PlayInfo
      })
      .then(i => alive && setInfo(i))
      .catch(e => alive && setError((e as Error).message))
    return () => {
      alive = false
    }
  }, [movie.slug, quality, capsQ, attempt])

  /* ----- motor de streaming ----- */
  useEffect(() => {
    const v = videoRef.current
    if (!info || !v) return
    if (!mseSupported()) {
      setError('Este navegador não tem o recurso de vídeo necessário. Use Chrome, Edge, Opera ou Safari atualizados.')
      return
    }
    let a = audioRef.current
    if (a == null) {
      a = pickAudio(info)
      audioRef.current = a
      setAudio(a)
      setSub(pickSubtitle(info, a))
    }
    const s = new Streamer(v, movie.slug, info, `${capsQ}&q=${encodeURIComponent(info.quality)}`, a)
    s.onError = m => setError(m)
    streamerRef.current = s
    setWaiting(true)
    v.playbackRate = rate
    s.start(startAt.current).then(() => {
      if (wantPlay.current) v.play().catch(() => setPaused(true))
    })
    return () => {
      s.destroy()
      if (streamerRef.current === s) streamerRef.current = null
    }
    // rate/capsQ entram só na criação; mudar a velocidade não recria o motor
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [info])

  /* ----- legendas: liga só a escolhida ----- */
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const apply = () => {
      for (let i = 0; i < v.textTracks.length; i++) v.textTracks[i].mode = i === sub ? 'showing' : 'disabled'
    }
    apply()
    v.textTracks.addEventListener('addtrack', apply)
    return () => v.textTracks.removeEventListener('addtrack', apply)
  }, [sub, info])

  /* ----- volume e velocidade ----- */
  useEffect(() => {
    const v = video()
    if (!v) return
    v.volume = volume
    v.muted = muted
  }, [volume, muted])

  useEffect(() => {
    const v = video()
    if (v) v.playbackRate = rate
  }, [rate])

  /* ----- progresso (Continuar assistindo) ----- */
  const lastSave = useRef(0)
  useEffect(() => {
    const save = () => {
      const v = video()
      if (v && duration && v.currentTime > 0) saveProgress(movie.slug, v.currentTime, duration)
    }
    window.addEventListener('pagehide', save)
    return () => {
      save()
      window.removeEventListener('pagehide', save)
    }
  }, [movie.slug, duration])

  /* ----- avisos rápidos na tela ----- */
  const flash = useCallback((text: string, icon?: ReactNode) => setOsd({ id: Date.now(), text, icon }), [])
  useEffect(() => {
    if (!osd) return
    const t = setTimeout(() => setOsd(null), 900)
    return () => clearTimeout(t)
  }, [osd])

  /* ----- ações ----- */
  const togglePlay = useCallback(() => {
    const v = video()
    if (!v) return
    if (ended) {
      v.currentTime = 0
      setEnded(false)
    }
    if (v.paused) {
      wantPlay.current = true
      v.play().catch(() => {})
    } else {
      wantPlay.current = false
      v.pause()
    }
  }, [ended])

  const seekBy = useCallback(
    (delta: number) => {
      const v = video()
      if (!v || !duration) return
      v.currentTime = Math.min(Math.max(0, v.currentTime + delta), duration - 0.5)
      setTime(v.currentTime)
      flash(`${delta > 0 ? '+' : '−'}${Math.abs(delta)} s`, <SkipIcon dir={delta > 0 ? 'fwd' : 'back'} seconds={Math.abs(delta)} />)
    },
    [duration, flash],
  )

  const seekTo = useCallback((t: number) => {
    const v = video()
    if (!v) return
    v.currentTime = t
    setTime(t)
    setEnded(false)
  }, [])

  const changeAudio = (index: number) => {
    if (!info || index === audio) return
    audioRef.current = index
    setAudio(index)
    const lang = info.audio.find(a => a.index === index)?.lang
    savePrefs({ audioLang: lang })
    setSub(pickSubtitle(info, index))
    streamerRef.current?.setAudio(index)
    flash(info.audio.find(a => a.index === index)?.label ?? 'Áudio')
  }

  const changeSub = (index: number) => {
    setSub(index)
    savePrefs({ subLang: index < 0 ? 'off' : 'on' })
    flash(index < 0 ? 'Legendas desligadas' : (info?.subtitles[index]?.label ?? 'Legenda'), <SubtitlesIcon />)
  }

  const changeQuality = (q: string) => {
    if (q === quality) return setMenu(null)
    const v = video()
    startAt.current = v?.currentTime ?? startAt.current
    wantPlay.current = v ? !v.paused : true
    setQuality(q)
    setMenu(null)
  }

  const changeRate = (r: number) => {
    setRate(r)
    savePrefs({ rate: r })
    flash(`Velocidade ${speedLabel(r)}`, <GaugeIcon />)
  }

  const changeVolume = useCallback(
    (next: number) => {
      const v = Math.round(Math.min(1, Math.max(0, next)) * 100) / 100
      setVolume(v)
      setMuted(v === 0)
      savePrefs({ volume: v, muted: v === 0 })
      flash(`Volume ${Math.round(v * 100)}%`, <VolumeIcon level={v} />)
    },
    [flash],
  )

  const toggleMute = useCallback(() => {
    setMuted(m => {
      savePrefs({ muted: !m })
      return !m
    })
  }, [])

  const toggleFullscreen = useCallback(() => {
    const el = rootRef.current
    if (!el) return
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    else el.requestFullscreen?.({ navigationUI: 'hide' }).catch(() => {})
  }, [])

  const togglePip = async () => {
    const v = video()
    if (!v) return
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture()
      else await v.requestPictureInPicture()
    } catch {
      flash('Picture-in-picture indisponível aqui')
    }
  }

  const leave = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    navigate(movie.back, { replace: false })
  }, [navigate, movie.back])

  useEffect(() => {
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])

  /* ----- controles somem quando ninguém mexe ----- */
  const idleTimer = useRef<number>(undefined)
  const wake = useCallback(() => {
    setIdle(false)
    window.clearTimeout(idleTimer.current)
    idleTimer.current = window.setTimeout(() => setIdle(true), 2800)
  }, [])
  useEffect(() => () => window.clearTimeout(idleTimer.current), [])
  const hidden = idle && !paused && !menu && started && !error

  /* ----- teclado ----- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.matches('input, textarea')) return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const k = e.key
      let handled = true
      if (k === ' ' || k === 'k' || k === 'K') togglePlay()
      else if (k === 'ArrowLeft') seekBy(-SKIP)
      else if (k === 'ArrowRight') seekBy(SKIP)
      else if (k === 'j' || k === 'J') seekBy(-10)
      else if (k === 'l' || k === 'L') seekBy(10)
      else if (k === 'ArrowUp') changeVolume((muted ? 0 : volume) + 0.1)
      else if (k === 'ArrowDown') changeVolume((muted ? 0 : volume) - 0.1)
      else if (k === 'm' || k === 'M') toggleMute()
      else if (k === 'f' || k === 'F') toggleFullscreen()
      else if (k === '>' || k === '.') changeRate(SPEEDS[Math.min(SPEEDS.indexOf(rate) + 1, SPEEDS.length - 1)])
      else if (k === '<' || k === ',') changeRate(SPEEDS[Math.max(SPEEDS.indexOf(rate) - 1, 0)])
      else if (k === 'c' || k === 'C') info?.subtitles.length && changeSub(sub < 0 ? 0 : sub + 1 >= info.subtitles.length ? -1 : sub + 1)
      else if (k === 'Escape') {
        if (menu) setMenu(null)
        else if (!document.fullscreenElement) leave()
        else handled = false
      } else if (/^\d$/.test(k) && duration) seekTo((Number(k) / 10) * duration)
      else handled = false
      if (handled) {
        e.preventDefault()
        wake()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  /* ----- Media Session: teclas de mídia e painel do sistema ----- */
  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    const ms = navigator.mediaSession
    ms.metadata = new MediaMetadata({
      title: movie.title,
      artist: movie.subtitle,
      album: 'PixelTV',
      artwork: movie.images.poster ? [{ src: tmdbImg(movie.images.poster, 'w342')!, sizes: '342x513', type: 'image/jpeg' }] : [],
    })
    const set = (a: MediaSessionAction, h: MediaSessionActionHandler | null) => {
      try {
        ms.setActionHandler(a, h)
      } catch {
        /* ação não suportada */
      }
    }
    set('play', () => video()?.play())
    set('pause', () => video()?.pause())
    set('seekbackward', () => seekBy(-SKIP))
    set('seekforward', () => seekBy(SKIP))
    set('seekto', d => d.seekTime != null && seekTo(d.seekTime))
    return () => {
      ;(['play', 'pause', 'seekbackward', 'seekforward', 'seekto'] as MediaSessionAction[]).forEach(a => set(a, null))
    }
  }, [movie, seekBy, seekTo])

  /* ----- eventos do <video> ----- */
  const onTimeUpdate = () => {
    const v = video()
    if (!v) return
    setTime(v.currentTime)
    if (v.currentTime > 2) setStarted(true)
    if (resumeHint && saved && Math.abs(v.currentTime - saved.t) > 20) setResumeHint(false)
    if (duration && Date.now() - lastSave.current > 5000) {
      lastSave.current = Date.now()
      saveProgress(movie.slug, v.currentTime, duration)
    }
  }

  const loading = !error && (!info || (!started && waiting))
  const audioTrack = info?.audio.find(a => a.index === audio)
  const badges = info
    ? [
        info.output.width >= 3200 ? '4K' : info.output.width >= 1700 ? 'HD' : null,
        info.output.dolbyVision ? 'Dolby Vision' : info.output.hdr ? 'HDR' : null,
        audioTrack?.label.includes('5.1') || audioTrack?.label.includes('7.1') ? '5.1' : null,
      ].filter(Boolean)
    : []

  return (
    <div
      ref={rootRef}
      className={`player ${hidden ? 'is-idle' : ''} subs-${subSize}`}
      onPointerMove={wake}
      onPointerDown={wake}
    >
      <video
        ref={videoRef}
        className="player__video"
        playsInline
        preload="auto"
        onClick={e => {
          // no toque, tocar na imagem só mostra/esconde os controles
          if ((e.nativeEvent as PointerEvent).pointerType === 'touch') return setIdle(i => !i)
          if (menu) return setMenu(null)
          togglePlay()
        }}
        onDoubleClick={toggleFullscreen}
        onPlay={() => {
          setPaused(false)
          setEnded(false)
        }}
        onPause={() => setPaused(true)}
        onWaiting={() => setWaiting(true)}
        onSeeking={() => setWaiting(true)}
        onPlaying={() => {
          setWaiting(false)
          setStarted(true)
        }}
        onCanPlay={() => setWaiting(false)}
        onSeeked={() => video()?.readyState && video()!.readyState >= 3 && setWaiting(false)}
        onEnded={() => {
          setEnded(true)
          saveProgress(movie.slug, duration, duration)
        }}
        onTimeUpdate={onTimeUpdate}
      >
        {info?.subtitles.map(s => (
          <track key={`${info.quality}-${s.index}`} kind="subtitles" srcLang="pt" label={s.label} src={`/api/play/${encodeURIComponent(movie.slug)}/subs/${s.index}.vtt`} />
        ))}
      </video>

      {/* tela de preparo: a arte do filme por trás, desfocada */}
      <AnimatePresence>
        {loading && (
          <motion.div className="player__prep" initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}>
            {movie.images.backdrop && (
              <img className="player__prep-art" src={tmdbImg(movie.images.backdrop, 'w1280')} srcSet={backdropSrcSet(movie.images.backdrop)} sizes="100vw" alt="" referrerPolicy="no-referrer" />
            )}
            <div className="player__prep-shade" />
            <div className="player__prep-body">
              <div className="player__prep-logo">
                <TitleLogo movie={movie} size="hero" />
              </div>
              <Spinner />
              <p className="t-callout secondary">{info ? 'Carregando o vídeo…' : `Preparando o ${movie.noun}…`}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!loading && waiting && !paused && !error && (
        <div className="player__buffering" aria-label="Carregando">
          <Spinner />
        </div>
      )}

      {/* topo */}
      <div className="player__top">
        <button type="button" className="btn btn--glass btn--sm glass player__back" onClick={leave}>
          <ChevronLeft /> Voltar
        </button>
        <div className="player__heading">
          <p className="t-headline player__title">{movie.title}</p>
          <p className="t-footnote secondary">{movie.subtitle}</p>
        </div>
        <div className="player__badges">
          {badges.map(b => (
            <span key={b} className="badge">
              {b}
            </span>
          ))}
        </div>
      </div>

      {/* centro: voltar 5 · play/pausa · avançar 5 */}
      {!loading && !error && (
        <div className="player__center">
          <button type="button" className="player__skip glass" onClick={() => seekBy(-SKIP)} aria-label={`Voltar ${SKIP} segundos`}>
            <SkipIcon dir="back" seconds={SKIP} />
          </button>
          <button type="button" className="player__bigplay glass" onClick={togglePlay} aria-label={paused ? 'Reproduzir' : 'Pausar'}>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={ended ? 'r' : paused ? 'p' : 'z'}
                className="icon-swap"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={{ type: 'spring', bounce: 0.25, duration: 0.35 }}
              >
                {ended ? <ReplayIcon /> : paused ? <PlayIcon /> : <PauseIcon />}
              </motion.span>
            </AnimatePresence>
          </button>
          <button type="button" className="player__skip glass" onClick={() => seekBy(SKIP)} aria-label={`Avançar ${SKIP} segundos`}>
            <SkipIcon dir="fwd" seconds={SKIP} />
          </button>
        </div>
      )}

      {/* base: linha do tempo + botões */}
      <div className="player__bottom">
        {resumeHint && saved && (
          <div className="player__resume glass">
            <span className="t-footnote">Continuando de {clock(saved.t)}</span>
            <button
              type="button"
              className="player__resume-btn"
              onClick={() => {
                seekTo(0)
                setResumeHint(false)
              }}
            >
              Começar do início
            </button>
          </div>
        )}
        <div className="player__panel glass glass--thick">
          <Scrubber videoRef={videoRef} duration={duration} time={time} onSeek={seekTo} onActivity={wake} />
          <div className="player__row">
            <div className="player__group">
              <IconButton label={paused ? 'Reproduzir (espaço)' : 'Pausar (espaço)'} onClick={togglePlay}>
                {paused ? <PlayIcon /> : <PauseIcon />}
              </IconButton>
              <div className="player__volume">
                <IconButton label={muted ? 'Ativar som (M)' : 'Silenciar (M)'} onClick={toggleMute}>
                  <VolumeIcon level={muted ? 0 : volume} />
                </IconButton>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={muted ? 0 : volume}
                  onChange={e => changeVolume(Number(e.target.value))}
                  aria-label="Volume"
                  style={{ '--v': muted ? 0 : volume } as React.CSSProperties}
                />
              </div>
              {audioTrack && <span className="player__now t-footnote secondary">{audioTrack.label}{sub >= 0 && info?.subtitles[sub] ? ` · Legenda ${info.subtitles[sub].label.toLowerCase()}` : ''}</span>}
            </div>

            <div className="player__group player__group--end">
              <MenuButton label="Velocidade" open={menu === 'speed'} onToggle={() => setMenu(m => (m === 'speed' ? null : 'speed'))} icon={<GaugeIcon />} value={rate === 1 ? undefined : speedLabel(rate)}>
                <MenuList title="Velocidade">
                  {SPEEDS.map(r => (
                    <MenuItem key={r} selected={rate === r} onClick={() => changeRate(r)}>
                      {speedLabel(r)}
                    </MenuItem>
                  ))}
                </MenuList>
              </MenuButton>

              <MenuButton label="Qualidade" open={menu === 'quality'} onToggle={() => setMenu(m => (m === 'quality' ? null : 'quality'))} icon={<QualityIcon />}>
                <MenuList title="Qualidade">
                  {(info?.qualities ?? []).map(q => (
                    <MenuItem
                      key={q.value}
                      selected={quality === q.value}
                      onClick={() => changeQuality(q.value)}
                      hint={
                        q.value === 'original'
                          ? info?.mode === 'copy'
                            ? 'Arquivo original, sem perda'
                            : 'Convertido para este aparelho'
                          : (info?.source.width ?? 0) >= 3200
                            ? 'Usa menos internet · conversão pesada'
                            : 'Usa menos internet'
                      }
                    >
                      {q.value === 'original' ? `Original · ${qualityName(q.height)}` : qualityName(q.height)}
                    </MenuItem>
                  ))}
                </MenuList>
              </MenuButton>

              <MenuButton label="Áudio e legendas" open={menu === 'audio'} onToggle={() => setMenu(m => (m === 'audio' ? null : 'audio'))} icon={<SubtitlesIcon />} wide>
                <div className="menu__columns">
                  <MenuList title="Áudio">
                    {(info?.audio ?? []).map(a => (
                      <MenuItem key={a.index} selected={audio === a.index} onClick={() => changeAudio(a.index)}>
                        {a.label}
                      </MenuItem>
                    ))}
                  </MenuList>
                  <MenuList title="Legendas">
                    <MenuItem selected={sub < 0} onClick={() => changeSub(-1)}>
                      Desligadas
                    </MenuItem>
                    {(info?.subtitles ?? []).map(s => (
                      <MenuItem key={s.index} selected={sub === s.index} onClick={() => changeSub(s.index)}>
                        {s.label}
                      </MenuItem>
                    ))}
                    {info && info.subtitles.length === 0 && <p className="menu__empty t-footnote tertiary">Nenhuma legenda no Drive</p>}
                  </MenuList>
                  <MenuList title="Tamanho">
                    {SUB_SIZES.map(s => (
                      <MenuItem
                        key={s.value}
                        selected={subSize === s.value}
                        onClick={() => {
                          setSubSize(s.value)
                          savePrefs({ subSize: s.value })
                        }}
                      >
                        {s.label}
                      </MenuItem>
                    ))}
                  </MenuList>
                </div>
              </MenuButton>

              {'pictureInPictureEnabled' in document && document.pictureInPictureEnabled && (
                <IconButton label="Picture-in-picture" onClick={togglePip}>
                  <PipIcon />
                </IconButton>
              )}
              <IconButton label={fullscreen ? 'Sair da tela cheia (F)' : 'Tela cheia (F)'} onClick={toggleFullscreen}>
                <FullscreenIcon exit={fullscreen} />
              </IconButton>
            </div>
          </div>
        </div>
      </div>

      {/* aviso rápido: +5 s, velocidade, volume */}
      <AnimatePresence>
        {osd && (
          <motion.div
            key={osd.id}
            className="player__osd glass glass--thick"
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9, filter: 'blur(6px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
          >
            {osd.icon}
            <span>{osd.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div className="player__error">
          <div className="player__error-card glass glass--thick">
            <p className="t-title-2">Não deu para tocar</p>
            <p className="t-body secondary">{error}</p>
            <div className="player__error-actions">
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => {
                  setError(null)
                  startAt.current = video()?.currentTime || startAt.current
                  setInfo(null)
                  setAttempt(n => n + 1)
                }}
              >
                Tentar de novo
              </button>
              <button type="button" className="btn btn--glass btn--sm glass" onClick={leave}>
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------- peças ---------- */

function Spinner() {
  return (
    <span className="spinner" aria-hidden="true">
      {Array.from({ length: 8 }, (_, i) => (
        <i key={i} style={{ '--i': i } as React.CSSProperties} />
      ))}
    </span>
  )
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className="pbtn" onClick={onClick} aria-label={label} title={label}>
      {children}
    </button>
  )
}

function MenuButton({
  label,
  icon,
  value,
  open,
  onToggle,
  wide,
  children,
}: {
  label: string
  icon: ReactNode
  value?: string
  open: boolean
  onToggle: () => void
  wide?: boolean
  children: ReactNode
}) {
  const reduce = useReducedMotion()
  return (
    <div className="menu-anchor">
      <button type="button" className={`pbtn ${value ? 'pbtn--value' : ''}`} onClick={onToggle} aria-label={label} title={label} aria-expanded={open}>
        {icon}
        {value && <span className="pbtn__value">{value}</span>}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className={`menu glass glass--thick ${wide ? 'menu--wide' : ''}`}
            role="menu"
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: 8, filter: 'blur(8px)' }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 4, filter: 'blur(6px)' }}
            transition={{ type: 'spring', bounce: 0, duration: 0.32 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function MenuList({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="menu__list">
      <p className="menu__title">{title}</p>
      {children}
    </div>
  )
}

function MenuItem({ selected, onClick, hint, children }: { selected: boolean; onClick: () => void; hint?: string; children: ReactNode }) {
  return (
    <button type="button" role="menuitemradio" aria-checked={selected} className="menu__item" onClick={onClick}>
      <span className="menu__check">{selected && <CheckIcon />}</span>
      <span className="menu__label">
        {children}
        {hint && <span className="menu__hint">{hint}</span>}
      </span>
    </button>
  )
}

/** Linha do tempo: arrastar com captura de ponteiro, prévia do tempo e trechos já carregados. */
function Scrubber({
  videoRef,
  duration,
  time,
  onSeek,
  onActivity,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>
  duration: number
  time: number
  onSeek: (t: number) => void
  onActivity: () => void
}) {
  const bar = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<number | null>(null)
  const [drag, setDrag] = useState<number | null>(null)
  const [ranges, setRanges] = useState<[number, number][]>([])

  // trechos carregados, atualizados com calma (não precisa de 60 fps)
  useEffect(() => {
    const id = setInterval(() => {
      const v = videoRef.current
      if (!v || !duration) return
      const out: [number, number][] = []
      for (let i = 0; i < v.buffered.length; i++) out.push([v.buffered.start(i), v.buffered.end(i)])
      setRanges(out)
    }, 500)
    return () => clearInterval(id)
  }, [videoRef, duration])

  const at = (clientX: number) => {
    const r = bar.current!.getBoundingClientRect()
    return Math.min(1, Math.max(0, (clientX - r.left) / r.width)) * duration
  }

  const shown = drag ?? time
  const pct = duration ? (shown / duration) * 100 : 0
  const preview = drag ?? hover

  return (
    <div className="scrub">
      <div
        ref={bar}
        className={`scrub__bar ${drag != null ? 'is-dragging' : ''}`}
        role="slider"
        tabIndex={0}
        aria-label="Linha do tempo"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(shown)}
        aria-valuetext={`${clock(shown)} de ${clock(duration)}`}
        onPointerDown={e => {
          if (!duration) return
          e.currentTarget.setPointerCapture(e.pointerId)
          setDrag(at(e.clientX))
          onActivity()
        }}
        onPointerMove={e => {
          if (!duration) return
          const t = at(e.clientX)
          if (drag != null) setDrag(t)
          else setHover(t)
          onActivity()
        }}
        onPointerUp={e => {
          if (drag == null) return
          onSeek(at(e.clientX))
          setDrag(null)
        }}
        onPointerCancel={() => setDrag(null)}
        onPointerLeave={() => setHover(null)}
      >
        <div className="scrub__track">
          {ranges.map(([s, e]) => (
            <span key={`${s}-${e}`} className="scrub__buffered" style={{ left: `${(s / duration) * 100}%`, width: `${((e - s) / duration) * 100}%` }} />
          ))}
          <span className="scrub__fill" style={{ transform: `scaleX(${pct / 100})` }} />
        </div>
        <span className="scrub__thumb" style={{ left: `${pct}%` }} />
        {preview != null && duration > 0 && (
          <span className="scrub__tip glass glass--thick" style={{ left: `${(preview / duration) * 100}%` }}>
            {clock(preview)}
          </span>
        )}
      </div>
      <div className="scrub__times t-caption">
        <span>{clock(shown)}</span>
        <span>−{clock(Math.max(0, duration - shown))}</span>
      </div>
    </div>
  )
}
