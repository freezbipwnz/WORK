import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useGameStore } from '@/game/store'
import type { Quest } from '@/game/types'
import GameButton from '@/components/ui/GameButton'
import { cn } from '@/lib/utils'

const CONFETTI_EMOJIS = ['⭐', '🪙', '✨']

/** confetti-mini: 12–16 emoji-частиц разлетаются из точки, 900ms (design.md §5) */
function ConfettiBurst() {
  const parts = useRef(
    Array.from({ length: 14 }, (_, i) => ({
      id: i,
      emoji: CONFETTI_EMOJIS[i % CONFETTI_EMOJIS.length],
      x: (Math.random() - 0.5) * 140,
      y: -20 - Math.random() * 70,
      rotate: (Math.random() - 0.5) * 120,
      delay: Math.random() * 0.08,
    })),
  )
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 z-10">
      {parts.current.map((p) => (
        <motion.span
          key={p.id}
          initial={{ x: 0, y: 0, opacity: 1, scale: 0.6, rotate: 0 }}
          animate={{ x: p.x, y: p.y, opacity: 0, scale: 1.1, rotate: p.rotate }}
          transition={{ duration: 0.9, delay: p.delay, ease: 'easeOut' }}
          className="absolute text-lg"
        >
          {p.emoji}
        </motion.span>
      ))}
    </div>
  )
}

function QuestRow({
  quest,
  index,
  onClaim,
}: {
  quest: Quest
  index: number
  onClaim: (id: string) => void
}) {
  const done = quest.progress >= quest.target
  const pct = Math.min(100, Math.round((quest.progress / quest.target) * 100))

  return (
    <motion.div
      initial={{ x: 12, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{
        type: 'spring',
        stiffness: 380,
        damping: 24,
        delay: index * 0.04,
      }}
      className={cn(
        'flex items-center gap-3 rounded-2xl border-2 bg-paper px-3 py-2 shadow-sticker',
        quest.claimed
          ? 'border-cocoa/10 opacity-55'
          : 'border-cocoa/15',
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-display truncate text-[15px] font-bold text-cocoa">
            {quest.title}
            {quest.claimed && ' ✅'}
          </span>
          <span className="tnum shrink-0 font-display text-xs font-bold text-cocoa-soft">
            {quest.progress}/{quest.target}
          </span>
        </div>
        <p className="truncate text-xs font-semibold text-cocoa-soft">
          {quest.description}
        </p>
        {/* Прогресс-бар honey */}
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-wall">
          <motion.div
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={{ type: 'spring', stiffness: 200, damping: 26 }}
            className={cn(
              'h-full rounded-full',
              done && !quest.claimed ? 'bg-sage' : 'bg-honey',
            )}
          />
        </div>
      </div>

      {quest.claimed ? (
        <span className="inline-flex min-h-[44px] shrink-0 items-center px-1 text-xl">
          ✅
        </span>
      ) : done ? (
        <motion.div
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          className="shrink-0"
        >
          <GameButton
            variant="buy"
            onClick={() => onClaim(quest.id)}
            className="px-3"
          >
            Забрать +{quest.reward}🪙{quest.xpReward ? ` +${quest.xpReward}✨` : ""}
          </GameButton>
        </motion.div>
      ) : (
        <span className="tnum inline-flex min-h-[44px] shrink-0 items-center rounded-xl bg-cream px-3 font-display text-sm font-bold text-honey">
          +{quest.reward}🪙{quest.xpReward ? ` +${quest.xpReward}✨` : ""}
        </span>
      )}
    </motion.div>
  )
}

/**
 * Панель «Квесты 📜» (game.md §4.3): список QuestRow из стора,
 * прогресс синкается симуляцией, награда — claimQuest + confetti-mini.
 */
export default function QuestsPanel() {
  const quests = useGameStore((s) => s.quests)
  const dailyQuests = useGameStore((s) => s.dailyQuests)
  const [burstAt, setBurstAt] = useState<string | null>(null)

  useEffect(() => {
    if (!burstAt) return
    const id = setTimeout(() => setBurstAt(null), 950)
    return () => clearTimeout(id)
  }, [burstAt])

  const handleClaim = (id: string) => {
    useGameStore.getState().claimQuest(id)
    setBurstAt(id)
  }

  const renderList = (list: Quest[], offset = 0) =>
    list.map((q, i) => (
      <div key={q.id} className="relative">
        {burstAt === q.id && <ConfettiBurst />}
        <QuestRow quest={q} index={offset + i} onClaim={handleClaim} />
      </div>
    ))

  return (
    <div className="relative h-full overflow-y-auto">
      <div className="flex flex-col gap-2 pr-1">
        <div className="flex items-baseline justify-between px-1">
          <h3 className="font-display text-sm font-extrabold text-cocoa">📅 Ежедневные</h3>
          <span className="text-[11px] font-semibold text-cocoa-soft">
            обновятся в 00:00 мск
          </span>
        </div>
        {renderList(dailyQuests)}
        <h3 className="mt-2 px-1 font-display text-sm font-extrabold text-cocoa">📜 Сюжетные</h3>
        {renderList(quests, dailyQuests.length)}
      </div>
    </div>
  )
}
