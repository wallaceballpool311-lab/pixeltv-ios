import { useState } from 'react'
import { tmdbImg, type Title } from '../lib/catalog'
import { isTV } from '../lib/tv'

interface Props {
  /** filme ou série: só usa o título e as imagens */
  movie: Pick<Title, 'title' | 'images'>
  size?: 'card' | 'hero'
  className?: string
}

/**
 * Logo oficial do título, convertido para branco puro (estilo Apple TV).
 * Sem logo, cai para o nome em tipografia display.
 */
export function TitleLogo({ movie, size = 'card', className }: Props) {
  const [failed, setFailed] = useState(false)
  // Na TV o logo "original" chega a 4000 px (decodificar trava a troca do destaque); w500/w300 cobrem a tela da TV.
  const src = tmdbImg(movie.images.logo, size === 'hero' ? (isTV ? 'w500' : 'original') : isTV ? 'w300' : 'w500')
  const aspect = movie.images.logoAspect ?? 3
  // Logos muito quadrados ficam enormes; limitar pela altura equilibra o peso visual.
  const shape = aspect < 1.6 ? 'tall' : aspect > 4.5 ? 'wide' : 'mid'

  if (!src || failed) {
    return (
      <span className={`title-text title-text--${size} ${className ?? ''}`} data-length={movie.title.length > 22 ? 'long' : 'short'}>
        {movie.title}
      </span>
    )
  }
  return (
    <img
      className={`title-logo title-logo--${size} title-logo--${shape} ${className ?? ''}`}
      src={src}
      alt={movie.title}
      // logos dos cards só carregam perto da tela (antes eram centenas de uma vez ao abrir o catálogo)
      loading={size === 'card' ? 'lazy' : undefined}
      decoding="async"
      referrerPolicy="no-referrer"
      draggable={false}
      onError={() => setFailed(true)}
    />
  )
}
