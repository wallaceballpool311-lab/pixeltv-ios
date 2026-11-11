// Modo TV: o app Android injeta `window.PixelTV` (ponte com o player nativo).
// No navegador, `?tv=1` liga o mesmo modo para testar com o teclado.

interface NativeBridge {
  play(payload: string): void
  appVersion?(): string
}

declare global {
  interface Window {
    PixelTV?: NativeBridge
    /** O app chama isto ao fechar o player, para o "Continuar assistindo" saber onde parou. */
    __pixelProgress?: (slug: string, position: number, duration: number) => void
    /** O app chama no botão Voltar: true = a página fechou algo (busca) e o app não deve voltar. */
    __pixelBack?: () => boolean
  }
}

const KEY = 'pixeltv:tv'

function detect() {
  if (typeof window === 'undefined') return false
  if (window.PixelTV) return true
  const q = new URLSearchParams(location.search).get('tv')
  try {
    if (q === '1') sessionStorage.setItem(KEY, '1')
    if (q === '0') sessionStorage.removeItem(KEY)
    return sessionStorage.getItem(KEY) === '1'
  } catch {
    return q === '1'
  }
}

export const isTV = detect()
export const nativePlayer = typeof window !== 'undefined' ? window.PixelTV : undefined

/* ---------- navegação espacial pelo controle remoto ---------- */

type Dir = 'up' | 'down' | 'left' | 'right'
const KEYS: Record<string, Dir> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }

// [data-nav-skip]: focável com mouse, mas fora do caminho do controle (ex.: pontinhos do carrossel)
const FOCUSABLE = 'a[href]:not([data-nav-skip]), button:not([disabled]):not([data-nav-skip]), input, [tabindex="0"]'

/** O teste caro (estilo calculado): só roda para quem já ganhou na geometria. */
function shown(el: HTMLElement) {
  const s = getComputedStyle(el)
  return s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) > 0.05 && !el.closest('[aria-hidden="true"], [inert]')
}

function visible(el: HTMLElement) {
  const r = el.getBoundingClientRect()
  return Boolean(r.width && r.height) && shown(el)
}

/**
 * Escolhe o elemento mais próximo na direção pedida (distância no eixo + desvio lateral pesado).
 * A página tem centenas de cards: primeiro só a geometria de todos (barata), depois o estilo
 * só dos melhores, em ordem, até achar um visível. Antes eram centenas de getComputedStyle por tecla.
 */
function next(from: HTMLElement, dir: Dir) {
  const a = from.getBoundingClientRect()
  const ax = a.left + a.width / 2
  const ay = a.top + a.height / 2
  const ranked: { el: HTMLElement; score: number }[] = []
  for (const el of document.querySelectorAll<HTMLElement>(FOCUSABLE)) {
    if (el === from) continue
    const b = el.getBoundingClientRect()
    if (!b.width || !b.height) continue
    const bx = b.left + b.width / 2
    const by = b.top + b.height / 2
    let main: number
    let cross: number
    if (dir === 'left' || dir === 'right') {
      main = dir === 'right' ? b.left - a.right : a.left - b.right
      if ((dir === 'right' ? bx <= ax : bx >= ax) || main < -a.width / 2) continue
      // mesma linha (sobreposição vertical) vence sempre
      const overlap = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
      cross = overlap > 0 ? 0 : Math.abs(by - ay)
    } else {
      main = dir === 'down' ? b.top - a.bottom : a.top - b.bottom
      if ((dir === 'down' ? by <= ay : by >= ay) || main < -a.height / 2) continue
      const overlap = Math.min(a.right, b.right) - Math.max(a.left, b.left)
      cross = overlap > 0 ? Math.abs(bx - ax) * 0.3 : Math.abs(bx - ax)
    }
    ranked.push({ el, score: Math.max(0, main) + cross * 2.2 })
  }
  ranked.sort((x, y) => x.score - y.score)
  return ranked.find(c => shown(c.el))?.el ?? null
}

function reveal(el: HTMLElement, instant = false) {
  // dentro de prateleira: rola só a prateleira na horizontal; a página centraliza na vertical.
  // Controle segurado: sem animação, senão uma rolagem suave atropela a outra
  el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: instant ? 'instant' : 'smooth' })
}

/** Controle segurado: no máximo um passo a cada REPEAT_MS; repetição parada na fila (tela ocupada) é descartada. */
const REPEAT_MS = 110
const STALE_MS = 160
let lastMove = 0

export function focusFirst(root: ParentNode = document) {
  const el = root.querySelector<HTMLElement>('[data-autofocus]') ?? [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].find(visible)
  if (el) {
    el.focus({ preventScroll: true })
    reveal(el)
  }
}

export function enableSpatialNavigation() {
  document.documentElement.classList.add('tv')
  // Transição entre páginas (View Transitions) fotografa a tela inteira duas vezes: em TV, engasga a troca de tela.
  // Sem a função, o roteador navega direto.
  try {
    Object.defineProperty(document, 'startViewTransition', { value: undefined, configurable: true })
  } catch {
    /* navegador sem a API: nada a desligar */
  }
  window.addEventListener('keydown', e => {
    const dir = KEYS[e.key]
    if (!dir) return
    const active = document.activeElement as HTMLElement | null
    // dentro de um campo de texto, esquerda/direita andam no texto
    if (active?.matches('input, textarea') && (dir === 'left' || dir === 'right')) return
    e.preventDefault()
    if (e.repeat) {
      const now = performance.now()
      if (now - lastMove < REPEAT_MS || now - e.timeStamp > STALE_MS) return
    }
    lastMove = performance.now()
    if (!active || active === document.body) return focusFirst()
    const target = next(active, dir)
    if (target) {
      target.focus({ preventScroll: true })
      reveal(target, e.repeat)
    }
  })
}
