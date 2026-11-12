import { ChevronLeft, ChevronRight, SlidersHorizontal, UsersRound } from 'lucide-react'
import { tr } from './i18n'

export function SidebarToggle({ side, folded, label, onToggle }: { side: 'left' | 'right'; folded: boolean; label: string; onToggle: () => void }) {
  const Arrow = (side === 'left') === folded ? ChevronRight : ChevronLeft
  const Icon = side === 'left' ? UsersRound : SlidersHorizontal
  const action = tr(folded ? '展开{0}' : '收起{0}', label)
  return <button className={`sidebar-toggle ${side} ${folded ? 'collapsed' : 'expanded'}`} onPointerDown={(e) => e.stopPropagation()} onClick={onToggle} aria-label={action} title={action} aria-expanded={!folded}>
    {folded && <Icon size={17} />}{folded && <span>{label}</span>}<Arrow size={15} />
  </button>
}
