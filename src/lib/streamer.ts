// Motor de reprodução: busca o filme em janelas de MP4 fragmentado e alimenta um MediaSource.
// Os tempos são os originais do filme (o servidor usa -copyts), então a linha do tempo nativa do
// <video> cobre o filme inteiro e as legendas .vtt alinham sem ajuste.

export interface PlayInfo {
  duration: number
  start: number
  mime: string
  mode: 'copy' | 'transcode'
  quality: string
  qualities: { value: string; height: number }[]
  output: { width: number; height: number; hdr: string | null; dolbyVision: number | boolean | null }
  source: { codec: string; width: number; height: number; hdr: string | null; dolbyVision: number | boolean | null }
  audio: { index: number; label: string; lang: string; default: boolean }[]
  subtitles: { index: number; label: string }[]
}

type MSCtor = typeof MediaSource
const MS: MSCtor | undefined =
  typeof window === 'undefined' ? undefined : ((window as unknown as { ManagedMediaSource?: MSCtor }).ManagedMediaSource ?? window.MediaSource)

export const mseSupported = () => Boolean(MS)

/** O que este navegador toca sem precisar recomprimir o vídeo. */
export function capabilities() {
  const ok = (c: string) => Boolean(MS?.isTypeSupported(`video/mp4; codecs="${c}"`))
  return {
    // quase todo filme 4K aqui é HEVC 10-bit; exigir Main10 evita falha no meio do filme
    hevc: ok('hvc1.2.4.L153.B0') && ok('hvc1.1.6.L150.90'),
    av1: ok('av01.0.08M.10'),
    vp9: ok('vp09.00.40.08'),
  }
}

export const capsQuery = (c: ReturnType<typeof capabilities>) =>
  Object.entries(c)
    .filter(([, v]) => v)
    .map(([k]) => `${k}=1`)
    .join('&')

const WINDOW = 120 // segundos por pedido (o Railway encerra pedidos muito longos)
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

export class Streamer {
  private ms: MediaSource
  private sb: SourceBuffer | null = null
  private generation = 0
  private ctrl: AbortController | null = null
  private maxAhead = 75
  private destroyed = false
  // posição que o próprio motor mandou o <video> buscar; o evento "seeking" dela é ignorado
  private expectSeek: number | null = null
  private ready: Promise<void>
  readonly objectUrl: string
  onError?: (message: string) => void

  constructor(
    private video: HTMLVideoElement,
    private slug: string,
    private info: PlayInfo,
    /** capacidades + qualidade, já no formato de query string */
    private query: string,
    private audioIndex: number,
  ) {
    this.ms = new (MS as MSCtor)()
    this.objectUrl = URL.createObjectURL(this.ms)
    // Safari exige isto para aceitar ManagedMediaSource sem fonte alternativa
    video.disableRemotePlayback = true
    video.src = this.objectUrl
    this.ready = new Promise(resolve => {
      this.ms.addEventListener(
        'sourceopen',
        () => {
          try {
            this.ms.duration = info.duration
            this.sb = this.ms.addSourceBuffer(info.mime)
            this.sb.mode = 'segments'
          } catch {
            this.fail('Este navegador não consegue tocar esse formato.')
          }
          resolve()
        },
        { once: true },
      )
    })
    video.addEventListener('seeking', this.onSeeking)
  }

  /** Começa (ou recomeça) a buscar a partir de `at` segundos. */
  async start(at: number) {
    await this.ready
    if (!this.sb || this.destroyed) return
    const gen = ++this.generation
    this.ctrl?.abort()
    await this.idle()
    if (gen !== this.generation) return
    // descarta tudo que não serve para o novo ponto
    try {
      if (this.ms.readyState === 'open') this.sb.abort()
      if (this.sb.buffered.length) {
        this.sb.remove(0, Number.POSITIVE_INFINITY)
        await this.idle()
      }
    } catch {
      /* buffer já vazio */
    }
    if (Math.abs(this.video.currentTime - at) > 0.5) {
      this.expectSeek = at
      this.video.currentTime = at
    }
    this.run(gen, at)
  }

  setAudio(index: number) {
    this.audioIndex = index
    return this.start(this.video.currentTime)
  }

  destroy() {
    this.destroyed = true
    this.generation++
    this.ctrl?.abort()
    this.video.removeEventListener('seeking', this.onSeeking)
    this.video.removeAttribute('src')
    this.video.load()
    URL.revokeObjectURL(this.objectUrl)
  }

  private onSeeking = () => {
    if (this.destroyed || !this.sb) return
    const t = this.video.currentTime
    if (this.expectSeek != null && Math.abs(t - this.expectSeek) < 0.75) {
      this.expectSeek = null
      return
    }
    this.expectSeek = null
    const b = this.sb.buffered
    for (let i = 0; i < b.length; i++) if (t >= b.start(i) - 0.1 && t <= b.end(i) - 0.5) return
    this.start(t)
  }

  private bufferedEnd(at = this.video.currentTime) {
    const b = this.sb?.buffered
    if (!b) return at
    for (let i = 0; i < b.length; i++) if (at >= b.start(i) - 1 && at <= b.end(i)) return b.end(i)
    return at
  }

  private async run(gen: number, from: number) {
    let t = from
    const end = this.info.start + this.info.duration
    while (gen === this.generation && !this.destroyed) {
      await this.waitForRoom(gen)
      if (gen !== this.generation) return
      const ok = await this.fetchWindow(gen, t)
      if (!ok || gen !== this.generation) return
      const reached = this.bufferedEnd(t)
      if (reached >= end - 1.5) break
      // a próxima janela começa um pouco antes do fim do que já chegou: o servidor volta ao
      // quadro-chave anterior, então nunca sobra buraco entre janelas
      t = Math.max(t + 5, reached - 1)
    }
    if (gen !== this.generation || this.destroyed) return
    await this.idle()
    if (this.ms.readyState === 'open') {
      try {
        this.ms.endOfStream()
      } catch {
        /* já encerrado */
      }
    }
  }

  private async fetchWindow(gen: number, t: number): Promise<boolean> {
    const ctrl = new AbortController()
    this.ctrl = ctrl
    let attempt = 0
    for (;;) {
      try {
        const url = `/api/play/${encodeURIComponent(this.slug)}/stream?t=${t.toFixed(2)}&w=${WINDOW}&a=${this.audioIndex}${this.query ? `&${this.query}` : ''}`
        const res = await fetch(url, { signal: ctrl.signal, credentials: 'same-origin' })
        if (!res.ok || !res.body) {
          const msg = await res.json().then(j => j.error as string).catch(() => null)
          throw new Error(msg || `HTTP ${res.status}`)
        }
        const reader = res.body.getReader()
        let chunks: Uint8Array[] = []
        let size = 0
        for (;;) {
          const { done, value } = await reader.read()
          if (gen !== this.generation) {
            reader.cancel().catch(() => {})
            return false
          }
          if (value) {
            chunks.push(value)
            size += value.byteLength
          }
          if (size >= 768 * 1024 || (done && size)) {
            const buf = concat(chunks, size)
            chunks = []
            size = 0
            if (!(await this.append(buf, gen))) return false
          }
          if (done) return true
          await this.waitForRoom(gen)
        }
      } catch (e) {
        if (ctrl.signal.aborted || gen !== this.generation) return false
        if (++attempt > 3) {
          this.fail((e as Error).message || 'A conexão com o servidor caiu.')
          return false
        }
        await sleep(800 * attempt)
        t = Math.max(t, this.bufferedEnd(t) - 1)
      }
    }
  }

  private async append(buf: Uint8Array, gen: number): Promise<boolean> {
    for (let tries = 0; tries < 6; tries++) {
      if (gen !== this.generation || !this.sb) return false
      await this.idle()
      try {
        this.sb.appendBuffer(buf as BufferSource)
        await this.idle()
        return true
      } catch (e) {
        if ((e as DOMException).name !== 'QuotaExceededError') {
          if (this.ms.readyState !== 'open') return false
          throw e
        }
        // memória do navegador cheia: solta o que já passou e encurta a folga à frente
        this.maxAhead = Math.max(12, this.maxAhead * 0.7)
        await this.evictBehind(8)
        await sleep(600)
      }
    }
    return false
  }

  private async waitForRoom(gen: number) {
    while (gen === this.generation && !this.destroyed) {
      const ahead = this.bufferedEnd() - this.video.currentTime
      if (ahead < this.maxAhead) return
      await this.evictBehind(30)
      await sleep(700)
    }
  }

  private async evictBehind(keep: number) {
    const sb = this.sb
    if (!sb || !sb.buffered.length) return
    const cut = this.video.currentTime - keep
    if (cut > sb.buffered.start(0) + 1) {
      await this.idle()
      try {
        sb.remove(0, cut)
        await this.idle()
      } catch {
        /* nada para remover */
      }
    }
  }

  private idle() {
    const sb = this.sb
    if (!sb || !sb.updating) return Promise.resolve()
    return new Promise<void>(resolve => sb.addEventListener('updateend', () => resolve(), { once: true }))
  }

  private fail(message: string) {
    if (!this.destroyed) this.onError?.(message)
  }
}

function concat(chunks: Uint8Array[], size: number) {
  if (chunks.length === 1) return chunks[0]
  const out = new Uint8Array(size)
  let o = 0
  for (const c of chunks) {
    out.set(c, o)
    o += c.byteLength
  }
  return out
}

/* ---------- Progresso (Continuar assistindo) ---------- */

const PROGRESS_KEY = 'hit-tv:progresso'

export interface Progress {
  t: number
  d: number
  at: number
}

export function readProgress(): Record<string, Progress> {
  try {
    const v = JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? '{}')
    return v && typeof v === 'object' ? v : {}
  } catch {
    return {}
  }
}

export function saveProgress(slug: string, t: number, d: number) {
  const all = readProgress()
  // perto do fim conta como assistido e sai de "Continuar assistindo"
  if (d && t / d > 0.94) delete all[slug]
  else if (t > 30) all[slug] = { t: Math.round(t), d: Math.round(d), at: Date.now() }
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(all))
  } catch {
    /* armazenamento indisponível */
  }
}
