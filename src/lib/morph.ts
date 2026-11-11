// Transição compartilhada (View Transitions API) entre a arte clicada e o topo da página do filme.
// O nome precisa ser único no documento, então só o elemento clicado o recebe.
export const MORPH_BACKDROP = 'movie-backdrop'
export const MORPH_LOGO = 'movie-logo'

function claim(el: HTMLElement | null | undefined, name: string) {
  document.querySelectorAll<HTMLElement>(`[data-morph="${name}"]`).forEach(n => {
    n.style.viewTransitionName = ''
    delete n.dataset.morph
  })
  if (!el) return
  el.style.viewTransitionName = name
  el.dataset.morph = name
}

/** Chamar no clique do card, antes do Link navegar. */
export function morphFrom(root: HTMLElement) {
  claim(root.querySelector<HTMLElement>('[data-morph-backdrop]'), MORPH_BACKDROP)
  claim(root.querySelector<HTMLElement>('[data-morph-logo]'), MORPH_LOGO)
}

/** Chamar no topo da página de destino (useLayoutEffect): recebe os nomes que o card clicado soltou. */
export function morphTo(backdrop: HTMLElement | null, logo: HTMLElement | null) {
  claim(backdrop, MORPH_BACKDROP)
  claim(logo, MORPH_LOGO)
}
