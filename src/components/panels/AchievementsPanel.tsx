import { motion } from 'framer-motion'
import { useGameStore } from '@/game/store'
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_CATEGORY_LABELS,
  ACHIEVEMENT_CATEGORY_ORDER,
  achievementDone,
  achievementProgress,
  type AchievementDef,
} from '@/game/achievements'
import GameButton from '@/components/ui/GameButton'
import { cn } from '@/lib/utils'

function AchievementRow({
  def,
  index,
  progress,
  claimed,
  onClaim,
}: {
  def: AchievementDef
  index: number
  progress: number
  claimed: boolean
  onClaim: (id: string) => void
}) {
  const done = progress >= def.target
  const pct = Math.min(100, Math.round((progress / def.target) * 100))

  return (
    <motion.div
      initial={{ x: 12, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 24, delay: index * 0.04 }}
      className={cn(
        'flex items-center gap-3 rounded-2xl border-2 bg-paper px-3 py-2 shadow-sticker',
        claimed ? 'border-cocoa/10 opacity-55' : 'border-cocoa/15',
      )}
    >
      <span className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-cream text-2xl shadow-[inset_0_2px_0_rgba(255,255,255,0.6)]">
        {def.emoji}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="min-w-0 truncate font-display text-[0.9375rem] font-bold text-cocoa" title={def.title}>
            {def.title}
            {claimed && ' ✅'}
          </span>
          <span className="tnum shrink-0 font-display text-xs font-bold text-cocoa-soft">
            {progress}/{def.target}
          </span>
        </div>
        <p className="truncate text-xs font-semibold text-cocoa-soft" title={def.description}>{def.description}</p>
        {/* Прогресс-бар honey */}
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-wall">
          <motion.div
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={{ type: 'spring', stiffness: 200, damping: 26 }}
            className={cn('h-full rounded-full', done && !claimed ? 'bg-sage' : 'bg-honey')}
          />
        </div>
      </div>

      {claimed ? (
        <span className="inline-flex min-h-[44px] shrink-0 items-center rounded-xl bg-sage/20 px-2 font-display text-xs font-bold text-sage">
          Получено ✅
        </span>
      ) : done ? (
        <motion.div
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          className="min-w-0"
        >
          <GameButton
            variant="buy"
            onClick={() => onClaim(def.id)}
            className="w-full min-w-0 truncate px-2 text-[0.8125rem]"
          >
            Забрать +{def.reward}🪙{def.gemReward ? ` +${def.gemReward}💎` : ''}
          </GameButton>
        </motion.div>
      ) : (
        <span className="tnum inline-flex min-h-[44px] shrink-0 items-center rounded-xl bg-cream px-3 font-display text-sm font-bold text-honey">
          +{def.reward}🪙{def.gemReward ? ` +${def.gemReward}💎` : ''}
        </span>
      )}
    </motion.div>
  )
}

/**
 * Панель «Достижения 🏆»: долгосрочные цели по категориям.
 * Прогресс — на лету из stats; забранные — бейдж «Получено» (claimedAchievements).
 */
export default function AchievementsPanel() {
  const stats = useGameStore((s) => s.stats)
  const claimed = useGameStore((s) => s.claimedAchievements)

  const handleClaim = (id: string) => {
    useGameStore.getState().claimAchievement(id)
  }

  const claimedCount = claimed.length

  return (
    <div className="flex h-full flex-col gap-2 overflow-y-auto pr-1">
      <div className="flex items-baseline justify-between px-1">
        <h3 className="font-display text-sm font-extrabold text-cocoa">🏆 Достижения</h3>
        <span className="tnum text-[0.6875rem] font-semibold text-cocoa-soft">
          получено {claimedCount}/{ACHIEVEMENTS.length}
        </span>
      </div>
      {ACHIEVEMENT_CATEGORY_ORDER.map((cat) => {
        const defs = ACHIEVEMENTS.filter((a) => a.category === cat)
        if (!defs.length) return null
        // выполненные незабранные — первыми, забранные — в хвост категории
        const sorted = [
          ...defs.filter((a) => !claimed.includes(a.id) && achievementDone(a, stats)),
          ...defs.filter((a) => !claimed.includes(a.id) && !achievementDone(a, stats)),
          ...defs.filter((a) => claimed.includes(a.id)),
        ]
        return (
          <div key={cat} className="flex flex-col gap-2">
            <h4 className="px-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-cocoa-soft">
              {ACHIEVEMENT_CATEGORY_LABELS[cat]}
            </h4>
            {sorted.map((def, i) => (
              <AchievementRow
                key={def.id}
                def={def}
                index={i}
                progress={achievementProgress(def, stats)}
                claimed={claimed.includes(def.id)}
                onClaim={handleClaim}
              />
            ))}
          </div>
        )
      })}
    </div>
  )
}
