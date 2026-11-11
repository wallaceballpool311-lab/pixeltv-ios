import { useCallback } from 'react'
import { useNavigate } from 'react-router'
import { episodeLabel, findEpisode } from '../lib/catalog'
import { serverConfig } from '../lib/config'
import { readProgress } from '../lib/streamer'
import { isTV, nativePlayer } from '../lib/tv'
import { useToast } from './Toast'
import { InfoIcon } from './Icons'

/** Filme ou episódio: os dois tocam pelo próprio slug. */
export interface Playable {
  slug: string
  title: string
  file: { available: boolean }
}

/**
 * Assistir: no app da TV abre o player nativo (vídeo direto do Drive);
 * no navegador usa o player web quando o servidor permite.
 */
export function usePlay() {
  const toast = useToast()
  const navigate = useNavigate()
  return useCallback(
    (item: Playable) => {
      const ep = findEpisode(item.slug)
      if (!item.file.available) {
        const name = ep ? episodeLabel(ep) : item.title
        return toast.show(`${name} ainda não tem arquivo de vídeo no Drive.`, <InfoIcon />)
      }
      if (isTV && nativePlayer) {
        const p = readProgress()[item.slug]
        // episódio: o player mostra "Dark · T1:E3 · Segredos"
        nativePlayer.play(JSON.stringify({ slug: item.slug, title: ep ? episodeLabel(ep) : item.title, startAt: p?.t ?? 0 }))
        return
      }
      if (!serverConfig.webPlayback) return toast.show('Assista pelo app da PixelTV na sua TV.', <InfoIcon />)
      navigate(`/assistir/${item.slug}`, { viewTransition: true })
    },
    [toast, navigate],
  )
}
