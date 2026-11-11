import { useCallback, useSyncExternalStore } from 'react'

// "Minha lista" fica só neste navegador. Sem conta, sem servidor.
const KEY = 'hit-tv:minha-lista'
const listeners = new Set<() => void>()
let cache: string[] | null = null

function read(): string[] {
  if (cache) return cache
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    cache = Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === 'string') : []
  } catch {
    cache = []
  }
  return cache
}

function write(next: string[]) {
  cache = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // modo privado ou armazenamento bloqueado: a lista vive só nesta aba
  }
  listeners.forEach(l => l())
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useMyList() {
  const list = useSyncExternalStore(subscribe, read, () => [])
  const toggle = useCallback((slug: string) => {
    const cur = read()
    write(cur.includes(slug) ? cur.filter(s => s !== slug) : [slug, ...cur])
  }, [])
  return { list, has: (slug: string) => list.includes(slug), toggle }
}
