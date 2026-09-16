import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useGameStore } from '@/game/store'
import { criticReviewMult } from '@/game/simulation'
import CurrencyChip from './ui/CurrencyChip'
import XPBar from './ui/XPBar'
import { cn } from '@/lib/utils'

/** Чип атмосферы: градиент berry → honey → sage по уровню */
function AtmosphereChip() {
  const atmosphere = useGameStore((s) => s.atmosphere())
  const puddles = useGameStore((s) => s.stains.filter((st) => st.kind === 'floor').length)
  const tone = atmosphere < 10 ? 'var(--berry)' : atmosphere < 30 ? 'var(--honey)' : 'var(--sage)'
  return (
    <div
      className="hud-el flex min-h-[44px] items-center gap-2 rounded-full bg-paper px-3 py-1.5 shadow-sticker outline-cozy"
      title={`Чаевые: +${Math.round(5 + 15 * Math.min(1, atmosphere / 50))}% (от декора, макс +50%)${puddles ? ` · Лужи на полу: −${2 * puddles}% 💧` : ''}`}
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
      {puddles > 0 && (
        <span className="tnum font-display text-xs font-bold text-berry" title={`Лужи на полу: −${2 * puddles}% атмосферы`}>
          💧−{2 * puddles}%
        </span>
      )}
    </div>
  )
}

/** Бейдж «Час пик 🔥» с обратным отсчётом (показывается только во время события) */
function RushBadge() {
  const active = useGameStore((s) => s.rushActive)
  const endsAt = useGameStore((s) => s.rushEndsAt)
  const [, force] = useState(0)
  useEffect(() => {
    if (!active) return
    const t = setInterval(() => force((n) => n + 1), 500)
    return () => clearInterval(t)
  }, [active])
  if (!active) return null
  const left = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))
  return (
    <div
      className="hud-el anim-pop-in flex min-h-[44px] items-center gap-1.5 rounded-full px-3 py-1.5 font-display text-xs font-bold text-white shadow-sticker"
      style={{ background: 'linear-gradient(135deg,#D9835B,#C96F6F)' }}
      title="Гости спавнятся в 2 раза чаще, чаевые +10%"
    >
      🔥 Час пик! ×2 гостей · <span className="tnum">{left}с</span>
    </div>
  )
}

/** Бейдж активного отзыва критика 📝: звёзды, эффект на поток и обратный отсчёт */
function CriticReviewBadge() {
  const review = useGameStore((s) => s.criticReview)
  const [, force] = useState(0)
  useEffect(() => {
    if (!review) return
    const t = setInterval(() => force((n) => n + 1), 500)
    return () => clearInterval(t)
  }, [review])
  if (!review || Date.now() >= review.until) return null
  const mult = criticReviewMult(review.stars)
  const pct =
    mult > 1 ? `+${Math.round((mult - 1) * 100)}% гостей` : mult < 1 ? `−${Math.round((1 - mult) * 100)}% гостей` : 'без эффекта'
  const left = Math.max(0, Math.ceil((review.until - Date.now()) / 1000))
  return (
    <div
      className={cn(
        'hud-el anim-pop-in flex min-h-[44px] items-center gap-1.5 rounded-full px-3 py-1.5 font-display text-xs font-bold shadow-sticker outline-cozy',
        mult > 1 ? 'bg-sage/30 text-cocoa' : mult < 1 ? 'bg-berry/20 text-cocoa' : 'bg-paper text-cocoa-soft',
      )}
      title={`Отзыв критика ${review.stars}★ влияет на приток гостей: ${pct}`}
    >
      📝 Отзыв {review.stars}★ · {pct} · <span className="tnum">{left}с</span>
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
        'hud-hide hidden text-xs font-semibold text-cocoa-soft transition-opacity sm:inline',
        visible ? 'opacity-100' : 'opacity-40',
      )}
    >
      💾 {visible ? 'Сохранено ✓' : 'Автосейв'}
    </span>
  )
}

const hudBtn =
  'hud-el flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl px-1 text-lg transition-transform active:scale-90 md:text-xl xl:text-2xl'

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
        className="h-8 cursor-pointer xl:h-10"
        whileTap={{ scale: 0.94 }}
        title="RestoCity — cozy restaurant sim"
      />
      <CurrencyChip icon="🪙" value={coins} tone="honey" />
      <CurrencyChip icon="💎" value={gems} tone="sky" />
      <XPBar level={level} xp={xp} />
      <AtmosphereChip />
      <RushBadge />
      <CriticReviewBadge />
      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        {heldDish && (
          <span className="hud-hide anim-pop-in rounded-full bg-sage/25 px-3 py-1 font-display text-xs font-bold text-cocoa">
            Несёшь {heldDish} — кликни по столу!
          </span>
        )}
        <button
          type="button"
          className={hudBtn}
          title="Рынок ингредиентов 🧺"
          onClick={() => window.dispatchEvent(new CustomEvent('restocity:open-market'))}
        >
          🧺
        </button>
        <button
          type="button"
          className={hudBtn}
          title="Магазин за кристаллы 💎"
          onClick={() => window.dispatchEvent(new CustomEvent('restocity:open-gems'))}
        >
          💎
        </button>
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
