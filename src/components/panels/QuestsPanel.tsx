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
          <span className="font-display truncate text-[0.9375rem] font-bold text-cocoa">
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
            Забрать +{quest.reward}🪙{quest.xpReward ? ` +${quest.xpReward}✨` : ""}{quest.gemReward ? ` +${quest.gemReward}💎` : ""}
          </GameButton>
        </motion.div>
      ) : (
        <span className="tnum inline-flex min-h-[44px] shrink-0 items-center rounded-xl bg-cream px-3 font-display text-sm font-bold text-honey">
          +{quest.reward}🪙{quest.xpReward ? ` +${quest.xpReward}✨` : ""}{quest.gemReward ? ` +${quest.gemReward}💎` : ""}
        </span>
      )}
    </motion.div>
  )
}

/** Заблокированный сюжетный квест: замок + «откроется на N ур.» */
function LockedQuestRow({ quest, index }: { quest: Quest; index: number }) {
  return (
    <motion.div
      initial={{ x: 12, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 24, delay: index * 0.04 }}
      className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-cocoa/15 bg-paper/60 px-3 py-2 opacity-60"
    >
      <span className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-xl">
        🔒
      </span>
      <div className="min-w-0 flex-1">
        <span className="font-display block truncate text-[15px] font-bold text-cocoa">
          {quest.title}
        </span>
        <p className="truncate text-xs font-semibold text-cocoa-soft">
          Откроется на {quest.unlockLevel} ур.
        </p>
      </div>
    </motion.div>
  )
}

/**
 * Панель «Квесты 📜»: вкладки «Сюжет» (линейка по уровням, заблокированные — 🔒)
 * и «Ежедневные» (3 слота, ресет в 00:00 мск). Награда — claimQuest + confetti-mini.
 */
export default function QuestsPanel() {
  const quests = useGameStore((s) => s.quests)
  const dailyQuests = useGameStore((s) => s.dailyQuests)
  const level = useGameStore((s) => s.level)
  const [tab, setTab] = useState<'story' | 'daily'>('story')
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

  // сюжетная линейка: доступные (по unlockLevel) сверху, заблокированные — внизу
  const unlocked = quests.filter((q) => (q.unlockLevel ?? 1) <= level)
  const locked = quests.filter((q) => (q.unlockLevel ?? 1) > level)
  // незабранные первыми, забранные — в хвост
  const sorted = [
    ...unlocked.filter((q) => !q.claimed),
    ...unlocked.filter((q) => q.claimed),
  ]

  const renderList = (list: Quest[], offset = 0) =>
    list.map((q, i) => (
      <div key={q.id} className="relative">
        {burstAt === q.id && <ConfettiBurst />}
        <QuestRow quest={q} index={offset + i} onClaim={handleClaim} />
      </div>
    ))

  const tabBtn = (id: 'story' | 'daily', label: string) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={cn(
        'min-h-[44px] flex-1 rounded-2xl px-3 font-display text-sm font-extrabold transition-colors outline-cozy',
        tab === id
          ? 'bg-cocoa text-paper shadow-sticker'
          : 'bg-paper text-cocoa-soft border-2 border-cocoa/15',
      )}
    >
      {label}
    </button>
  )

  return (
    <div className="relative flex h-full flex-col">
      <div className="mb-2 flex gap-2">
        {tabBtn('story', '📜 Сюжет')}
        {tabBtn('daily', '📅 Ежедневные')}
      </div>
      <div className="flex-1 overflow-y-auto">
        {tab === 'story' ? (
          <div className="flex flex-col gap-2 pr-1">
            {renderList(sorted)}
            {locked.length > 0 && (
              <h4 className="mt-1 px-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-cocoa-soft">
                Скоро откроется
              </h4>
            )}
            {locked.map((q, i) => (
              <LockedQuestRow key={q.id} quest={q} index={sorted.length + i} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2 pr-1">
            <div className="flex items-baseline justify-between px-1">
              <h3 className="font-display text-sm font-extrabold text-cocoa">📅 Ежедневные</h3>
              <span className="text-[0.6875rem] font-semibold text-cocoa-soft">
                обновятся в 00:00 мск
              </span>
            </div>
            {renderList(dailyQuests)}
          </div>
        )}
      </div>
    </div>
  )
}
