import { useCallback } from 'react'

/** Faz o brilho especular do vidro seguir o ponteiro (--gx/--gy em %). */
export function useGlassPointer<T extends HTMLElement>() {
  const onPointerMove = useCallback((e: React.PointerEvent<T>) => {
    if (e.pointerType !== 'mouse') return
    const el = e.currentTarget
    const r = el.getBoundingClientRect()
    el.style.setProperty('--gx', `${((e.clientX - r.left) / r.width) * 100}%`)
    el.style.setProperty('--gy', `${((e.clientY - r.top) / r.height) * 100}%`)
  }, [])
  const onPointerLeave = useCallback((e: React.PointerEvent<T>) => {
    e.currentTarget.style.removeProperty('--gx')
    e.currentTarget.style.removeProperty('--gy')
  }, [])
  return { onPointerMove, onPointerLeave }
}
