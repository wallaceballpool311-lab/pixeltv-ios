import { motion } from 'motion/react'

/** Chip de filtro com a "lente" branca que desliza até o escolhido (o grupo precisa de um LayoutGroup próprio). */
export function FilterChip({ active, onClick, group, children }: { active: boolean; onClick: () => void; group: string; children: React.ReactNode }) {
  return (
    <button type="button" className="chip filter-chip" aria-pressed={active} onClick={onClick}>
      {active && <motion.span layoutId={`${group}-lens`} className="filter-chip__lens" transition={{ type: 'spring', bounce: 0.15, duration: 0.45 }} />}
      <span className="filter-chip__label">{children}</span>
    </button>
  )
}
