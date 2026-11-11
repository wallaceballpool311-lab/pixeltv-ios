import { useState } from 'react'

interface ImgProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** Some suavemente quando a imagem termina de carregar. */
  fade?: boolean
}

export function Img({ fade = true, className, onLoad, onError, ...rest }: ImgProps) {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  if (!rest.src || state === 'error') return null
  return (
    <img
      decoding="async"
      referrerPolicy="no-referrer"
      draggable={false}
      {...rest}
      className={[className, fade && 'img-fade', state === 'ready' && 'is-ready'].filter(Boolean).join(' ')}
      ref={el => {
        // imagem já em cache dispara load antes do React ligar o handler
        if (el?.complete && el.naturalWidth && state === 'loading') setState('ready')
      }}
      onLoad={e => {
        setState('ready')
        onLoad?.(e)
      }}
      onError={e => {
        setState('error')
        onError?.(e)
      }}
    />
  )
}
