import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export type TabId = 'shop' | 'market' | 'staff' | 'quests' | 'delivery' | 'achievements' | 'gems'

const TABS: { id: TabId; icon: string; label: string }[] = [
  { id: 'shop', icon: '🛒', label: 'Магазин' },
  { id: 'market', icon: '🧺', label: 'Рынок' },
  { id: 'staff', icon: '👥', label: 'Персонал' },
  { id: 'quests', icon: '📜', label: 'Квесты' },
  { id: 'delivery', icon: '🛵', label: 'Доставка' },
  { id: 'achievements', icon: '🏆', label: 'Награды' },
  { id: 'gems', icon: '💎', label: 'Гемы' },
]

interface Props {
  active: TabId
  onChange: (tab: TabId) => void
  /** пульсирующая точка на табе «Квесты», если есть награда */
  questsBadge?: boolean
  /** пульсирующая точка на табе «Доставка», если есть активный заказ */
  deliveryBadge?: boolean
  /** пульсирующая точка на табе «Награды», если есть достижение к выдаче */
  achievementsBadge?: boolean
}

/** Табы нижней панели: активный — terracotta (design.md §10 TabBar).
 *  Горизонтальная строка по умолчанию; в ландшафте телефона — вертикальная колонка (CSS .panel-tabs). */
export default function TabBar({ active, onChange, questsBadge, deliveryBadge, achievementsBadge }: Props) {
  return (
    <div className="flex gap-2">
      {TABS.map((t) => (
        <motion.button
          key={t.id}
          type="button"
          title={t.label}
          whileTap={{ scale: 0.94 }}
          onClick={() => onChange(t.id)}
          className={cn(
            'relative flex min-h-[44px] min-w-[44px] shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 font-display text-sm font-bold shadow-sticker outline-cozy lg:px-2 xl:text-base',
            active === t.id ? 'bg-terracotta text-paper' : 'bg-paper text-cocoa hover:bg-wall',
          )}
        >
          <span className="text-lg leading-none">{t.icon}</span>
          {/* подписи — только в stacked-раскладке (<1024px): в сайдбаре 440–560px
              7 табов с текстом в ряд не помещаются, иконки + title достаточно */}
          <span className="hidden md:max-lg:inline">{t.label}</span>
          {t.id === 'delivery' && deliveryBadge && (
            <span className="anim-badge-pulse absolute -right-1 -top-1 h-3 w-3 rounded-full bg-berry outline outline-2 outline-paper" />
          )}
          {t.id === 'quests' && questsBadge && (
            <span className="anim-badge-pulse absolute -right-1 -top-1 h-3 w-3 rounded-full bg-honey outline outline-2 outline-paper" />
          )}
          {t.id === 'achievements' && achievementsBadge && (
            <span className="anim-badge-pulse absolute -right-1 -top-1 h-3 w-3 rounded-full bg-sage outline outline-2 outline-paper" />
          )}
        </motion.button>
      ))}
    </div>
  )
}
