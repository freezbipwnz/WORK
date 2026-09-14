import { motion } from 'framer-motion'
import { xpTarget } from '@/game/catalog'

interface Props {
  level: number
  xp: number
}

/** Блок уровня: бейдж «Ур. N» + полоса 8px honey-градиент (design.md §2/§7) */
export default function XPBar({ level, xp }: Props) {
  const target = xpTarget(level)
  const pct = Math.min(100, (xp / target) * 100)
  return (
    <div className="flex items-center gap-2">
      <motion.div
        key={level}
        initial={{ scale: 1.3 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 12 }}
        className="font-display flex h-9 w-9 items-center justify-center rounded-full bg-terracotta text-sm font-extrabold text-paper shadow-sticker outline-cozy"
        title={`Уровень ${level}`}
      >
        {level}
      </motion.div>
      <div className="flex flex-col gap-0.5">
        <span className="font-display text-xs font-bold leading-none text-cocoa">
          Ур. {level}
        </span>
        <div className="h-1.5 w-[60px] overflow-hidden rounded-full bg-wall shadow-card-inset sm:h-2 sm:w-[120px]">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-honey to-[#F3CC7E]"
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
        <span className="tnum text-[11px] font-medium leading-none text-cocoa-soft">
          {xp} / {target} XP
        </span>
      </div>
    </div>
  )
}
