import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useGameStore } from '@/game/store'
import type { Quest } from '@/game/types'
import { FESTIVAL_TARGET, FESTIVAL_TIERS, festivalDish } from '@/game/festival'
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

/** Секция «Кулинарный фестиваль 🎪»: блюдо недели, прогресс порций, награды по тирам */
function FestivalSection() {
  const festival = useGameStore((s) => s.festival)
  const dish = festivalDish(festival.weekKey)
  const pct = Math.min(100, Math.round((festival.portions / FESTIVAL_TARGET) * 100))

  return (
    <div className="flex flex-col gap-2 pr-1">
      {/* Блюдо недели */}
      <motion.div
        initial={{ x: 12, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 24 }}
        className="outline-cozy flex items-center gap-3 rounded-2xl bg-paper px-3 py-2 shadow-sticker"
      >
        <span className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-cream text-3xl shadow-[inset_0_2px_0_rgba(255,255,255,0.6)]">
          {dish.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <span className="font-display block truncate text-[0.9375rem] font-bold text-cocoa">
            Блюдо недели: {dish.name}
          </span>
          <p className="truncate text-xs font-semibold text-cocoa-soft">
            Готовь любые блюда: +1 порция, {dish.emoji} {dish.name} — +3 порции
          </p>
        </div>
      </motion.div>

      {/* Прогресс недели */}
      <div className="rounded-2xl border-2 border-cocoa/15 bg-paper px-3 py-2 shadow-sticker">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-display text-[0.9375rem] font-bold text-cocoa">🎪 Прогресс фестиваля</span>
          <span className="tnum font-display text-xs font-bold text-cocoa-soft">
            {festival.portions}/{FESTIVAL_TARGET}
          </span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-wall">
          <motion.div
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={{ type: 'spring', stiffness: 200, damping: 26 }}
            className={cn('h-full rounded-full', pct >= 100 ? 'bg-sage' : 'bg-honey')}
          />
        </div>
        <p className="mt-1 text-[0.6875rem] font-semibold text-cocoa-soft">
          Неделя {festival.weekKey} · прогресс обнуляется в понедельник (по мск)
        </p>
      </div>

      {/* Награды по вкладу */}
      <h4 className="px-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-cocoa-soft">
        Награды по вкладу
      </h4>
      {FESTIVAL_TIERS.map((tier, i) => {
        const claimed = festival.claimedTiers.includes(i)
        const reached = festival.portions >= tier.portions
        return (
          <motion.div
            key={tier.portions}
            initial={{ x: 12, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 380, damping: 24, delay: 0.05 * (i + 1) }}
            className={cn(
              'flex items-center gap-3 rounded-2xl border-2 bg-paper px-3 py-2 shadow-sticker',
              claimed ? 'border-cocoa/10 opacity-55' : 'border-cocoa/15',
            )}
          >
            <div className="min-w-0 flex-1">
              <span className="font-display block truncate text-[0.9375rem] font-bold text-cocoa">
                {tier.portions}+ порций{claimed && ' ✅'}
              </span>
              <p className="truncate text-xs font-semibold text-cocoa-soft">
                Награда: +{tier.coins}🪙{tier.gems ? ` +${tier.gems}💎` : ''}
              </p>
            </div>
            {claimed ? (
              <span className="inline-flex min-h-[44px] shrink-0 items-center px-1 text-xl">✅</span>
            ) : reached ? (
              <GameButton
                variant="buy"
                onClick={() => useGameStore.getState().claimFestivalReward(i)}
                className="shrink-0 px-3"
              >
                Забрать
              </GameButton>
            ) : (
              <span className="tnum inline-flex min-h-[44px] shrink-0 items-center rounded-xl bg-cream px-3 font-display text-sm font-bold text-honey">
                {tier.portions} 🍽
              </span>
            )}
          </motion.div>
        )
      })}
    </div>
  )
}

/** Заблокированный сюжетный квест: замок + «откроется на N ур.» */
function LockedQuestRow({ quest, index }: { quest: Quest; index: number }) {  return (
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
  const [tab, setTab] = useState<'story' | 'daily' | 'festival'>('story')
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

  const tabBtn = (id: 'story' | 'daily' | 'festival', label: string) => (
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
        {tabBtn('festival', '🎪 Фестиваль')}
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
        ) : tab === 'festival' ? (
          <FestivalSection />
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
