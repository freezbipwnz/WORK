import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useGameStore } from '@/game/store'
import CurrencyChip from './ui/CurrencyChip'
import XPBar from './ui/XPBar'
import { cn } from '@/lib/utils'

/** Чип атмосферы: градиент berry → honey → sage по уровню */
function AtmosphereChip() {
  const atmosphere = useGameStore((s) => s.atmosphere())
  const tone = atmosphere < 10 ? 'var(--berry)' : atmosphere < 30 ? 'var(--honey)' : 'var(--sage)'
  return (
    <div
      className="flex min-h-[44px] items-center gap-2 rounded-full bg-paper px-3 py-1.5 shadow-sticker outline-cozy"
      title={`Чаевые: +${Math.round(5 + 15 * Math.min(1, atmosphere / 50))}% (от декора, макс +50%)`}
    >
      <span>🌸</span>
      <div className="h-1.5 w-10 overflow-hidden rounded-full bg-wall">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(100, atmosphere * 2)}%`, background: tone }}
        />
      </div>
      <span className="tnum font-display text-sm font-bold" style={{ color: tone }}>
        {atmosphere}%
      </span>
    </div>
  )
}

function SaveIndicator() {
  const savedAt = useGameStore((s) => s.savedAt)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (!savedAt) return
    setVisible(true)
    const t = setTimeout(() => setVisible(false), 2000)
    return () => clearTimeout(t)
  }, [savedAt])
  return (
    <span
      className={cn(
        'hidden text-xs font-semibold text-cocoa-soft transition-opacity sm:inline',
        visible ? 'opacity-100' : 'opacity-40',
      )}
    >
      💾 {visible ? 'Сохранено ✓' : 'Автосейв'}
    </span>
  )
}

const hudBtn =
  'flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl px-1 text-lg transition-transform active:scale-90'

export default function Hud({ onReset }: { onReset: () => void }) {
  const coins = useGameStore((s) => s.coins)
  const gems = useGameStore((s) => s.gems)
  const level = useGameStore((s) => s.level)
  const xp = useGameStore((s) => s.xp)
  const soundOn = useGameStore((s) => s.soundOn)
  const speed = useGameStore((s) => s.speed)
  const heldDish = useGameStore((s) => {
    const job = s.kitchenJobs.find((j) => j.id === s.heldDishId)
    return s.clients.find((c) => c.id === job?.clientId)?.order ?? null
  })

  return (
    <motion.header
      initial={{ y: '-110%' }}
      animate={{ y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="flex min-h-16 shrink-0 flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl bg-paper px-3 py-1.5 shadow-panel sm:px-4"
    >
      <motion.img
        src="./logo.svg"
        alt="RestoCity"
        className="h-8 cursor-pointer"
        whileTap={{ scale: 0.94 }}
        title="RestoCity — cozy restaurant sim"
      />
      <CurrencyChip icon="🪙" value={coins} tone="honey" />
      <CurrencyChip icon="💎" value={gems} tone="sky" />
      <XPBar level={level} xp={xp} />
      <AtmosphereChip />
      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        {heldDish && (
          <span className="anim-pop-in rounded-full bg-sage/25 px-3 py-1 font-display text-xs font-bold text-cocoa">
            Несёшь {heldDish} — кликни по столу!
          </span>
        )}
        <button
          type="button"
          className={hudBtn}
          title={`Скорость игры ×${speed}`}
          onClick={() => useGameStore.getState().toggleSpeed()}
        >
          {speed === 1 ? '⏩' : '⏩'}
          <span className="tnum font-display text-xs font-bold text-cocoa">×{speed}</span>
        </button>
        <button
          type="button"
          className={hudBtn}
          title={soundOn ? 'Выключить звук' : 'Включить звук'}
          onClick={() => useGameStore.getState().toggleSound()}
        >
          {soundOn ? '🔊' : '🔇'}
        </button>
        <SaveIndicator />
        <button type="button" className={hudBtn} title="Сбросить прогресс" onClick={onReset}>
          ↺
        </button>
      </div>
    </motion.header>
  )
}
