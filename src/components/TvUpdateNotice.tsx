import { useEffect, useRef } from 'react'
import { serverConfig } from '../lib/config'
import { nativePlayer } from '../lib/tv'

const KEY = 'pixeltv:update-dismissed'

/** "1.0.0" < "1.1.0"? Sem versão informada conta como antiga (a 1.0 já informa). */
function older(current: string | undefined, latest: string) {
  if (!current) return true
  const a = current.split('.').map(Number)
  const b = latest.split('.').map(Number)
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (b[i] || 0) - (a[i] || 0)
    if (d) return d > 0
  }
  return false
}

/**
 * A versão 1.0 do app de TV é este site dentro de uma WebView e não sabe se atualizar sozinha.
 * Quem ainda está nela vê este aviso a cada abertura, com o caminho pelo Downloader.
 */
export function shouldShowTvUpdate() {
  const latest = serverConfig.apk.version
  if (!nativePlayer || !serverConfig.apk.available || !latest) return false
  try {
    if (sessionStorage.getItem(KEY) === latest) return false
  } catch {
    /* sem storage: mostra */
  }
  let current: string | undefined
  try {
    current = nativePlayer.appVersion?.()
  } catch {
    current = undefined
  }
  return older(current, latest)
}

export function TvUpdateNotice({ onClose }: { onClose: () => void }) {
  const button = useRef<HTMLButtonElement>(null)
  const { version, shortUrl } = serverConfig.apk

  // depois do foco automático da tela (120 ms), o foco vem para cá
  useEffect(() => {
    const t = setTimeout(() => button.current?.focus({ preventScroll: true }), 320)
    return () => clearTimeout(t)
  }, [])

  const close = () => {
    try {
      sessionStorage.setItem(KEY, version ?? '')
    } catch {
      /* ignora */
    }
    onClose()
  }

  return (
    <div className="tv-update" role="dialog" aria-modal="true" aria-labelledby="tv-update-title">
      <div className="tv-update__card glass glass--thick">
        <p className="tv-update__eyebrow">Atualização disponível · versão {version}</p>
        <h2 id="tv-update-title" className="tv-update__title">
          A PixelTV ficou bem mais rápida
        </h2>
        <p className="tv-update__text">
          A nova versão tem uma interface feita para TV, que não trava, e um player que abre os filmes muito mais
          depressa. Esta versão antiga não se atualiza sozinha: é preciso instalar a nova uma vez.
        </p>
        <ol className="tv-update__steps">
          <li>Abra o app <strong>Downloader</strong> na TV</li>
          <li>
            Digite <strong className="tv-update__url">{shortUrl || 'pixeltv.discloud.app/tv'}</strong> e confirme
          </li>
          <li>Toque em Instalar quando o download terminar</li>
        </ol>
        <p className="tv-update__note">
          Não precisa desinstalar esta versão: a nova instala por cima e mantém a sua lista e o que você estava
          assistindo. Daí em diante, as atualizações chegam pelo próprio app, com um botão.
        </p>
        <button ref={button} type="button" className="btn btn--primary" onClick={close}>
          Entendi
        </button>
      </div>
    </div>
  )
}
