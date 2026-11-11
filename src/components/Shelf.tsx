import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { ChevronLeft, ChevronRight } from './Icons'

interface Props {
  title: string
  kind?: 'landscape' | 'poster' | 'person'
  seeAll?: string
  /** à direita do título (ex.: seletor de temporada) */
  aside?: ReactNode
  children: ReactNode
  className?: string
}

/** Prateleira horizontal: rolagem nativa (trackpad, toque, teclado) + setas de vidro no desktop. */
export function Shelf({ title, kind = 'landscape', seeAll, aside, children, className = '' }: Props) {
  const scroller = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ start: true, end: false })

  const measure = useCallback(() => {
    const el = scroller.current
    if (!el) return
    setEdges({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 })
  }, [])

  useEffect(() => {
    measure()
    const el = scroller.current
    if (!el) return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [measure])

  const page = (dir: 1 | -1) => {
    const el = scroller.current
    if (!el) return
    el.scrollBy({ left: dir * el.clientWidth * 0.86, behavior: 'smooth' })
  }

  return (
    <section className={`shelf shelf--${kind} ${className}`} aria-label={title}>
      <div className="shelf__head wrap">
        <h2 className="t-title-2">
          {seeAll ? (
            <Link to={seeAll} className="shelf__title-link" viewTransition>
              {title}
              <ChevronRight />
            </Link>
          ) : (
            title
          )}
        </h2>
        {aside}
      </div>
      <div className="shelf__body">
        <div ref={scroller} className="shelf__track no-scrollbar" onScroll={measure}>
          {children}
        </div>
        <button
          type="button"
          className="shelf__arrow shelf__arrow--prev glass"
          onClick={() => page(-1)}
          aria-label="Anteriores"
          tabIndex={-1}
          data-hidden={edges.start}
        >
          <ChevronLeft />
        </button>
        <button
          type="button"
          className="shelf__arrow shelf__arrow--next glass"
          onClick={() => page(1)}
          aria-label="Próximos"
          tabIndex={-1}
          data-hidden={edges.end}
        >
          <ChevronRight />
        </button>
      </div>
    </section>
  )
}
