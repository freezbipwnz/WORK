import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export type TabId = 'shop' | 'staff' | 'quests'

const TABS: { id: TabId; icon: string; label: string }[] = [
  { id: 'shop', icon: '🛒', label: 'Магазин' },
  { id: 'staff', icon: '👥', label: 'Персонал' },
  { id: 'quests', icon: '📜', label: 'Квесты' },
]

interface Props {
  active: TabId
  onChange: (tab: TabId) => void
  /** пульсирующая точка на табе «Квесты», если есть награда */
  questsBadge?: boolean
}

/** Табы нижней панели: активный — terracotta (design.md §10 TabBar).
 *  Горизонтальная строка по умолчанию; в ландшафте телефона — вертикальная колонка (CSS .panel-tabs). */
export default function TabBar({ active, onChange, questsBadge }: Props) {
  return (
    <div className="flex gap-2">
      {TABS.map((t) => (
        <motion.button
          key={t.id}
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={() => onChange(t.id)}
          className={cn(
            'relative flex min-h-[44px] min-w-[44px] items-center gap-2 rounded-xl px-3 py-2.5 font-display text-sm font-bold shadow-sticker outline-cozy',
            active === t.id ? 'bg-terracotta text-paper' : 'bg-paper text-cocoa hover:bg-wall',
          )}
        >
          <span className="text-lg leading-none">{t.icon}</span>
          <span className="hidden md:inline">{t.label}</span>
          {t.id === 'quests' && questsBadge && (
            <span className="anim-badge-pulse absolute -right-1 -top-1 h-3 w-3 rounded-full bg-honey outline outline-2 outline-paper" />
          )}
        </motion.button>
      ))}
    </div>
  )
}
