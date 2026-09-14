import { useEffect, useReducer } from 'react'
import { motion } from 'framer-motion'
import { useGameStore } from '@/game/store'
import { DELIVERY_MIN_LEVEL } from '@/game/delivery'
import { getItem } from '@/game/catalog'
import type { DeliveryOrder } from '@/game/types'
import GameButton from '@/components/ui/GameButton'
import { cn } from '@/lib/utils'

function DeliveryCard({
  order,
  index,
  freeStove,
  live,
}: {
  order: DeliveryOrder
  index: number
  freeStove: boolean
  live: boolean
}) {
  const kitchenJobs = useGameStore((s) => s.kitchenJobs)
  const inProgress = kitchenJobs.filter(
    (j) => j.kind === 'delivery' && j.deliveryId === order.id,
  ).length
  const leftSec = Math.max(0, Math.ceil((order.expiresAt - Date.now()) / 1000))
  const urgent = leftSec <= 15
  const pct = Math.round(((order.cooked + inProgress) / order.qty) * 100)
  const allStarted = order.cooked + inProgress >= order.qty
  const disabled = !live || allStarted || !freeStove

  return (
    <motion.div
      initial={{ x: 12, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 24, delay: index * 0.04 }}
      className="flex items-center gap-3 rounded-2xl border-2 border-cocoa/15 bg-paper px-3 py-2 shadow-sticker"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cream text-2xl">
        {order.dish}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-display truncate text-[0.9375rem] font-bold text-cocoa">
            🛵 Доставка ×{order.qty}
          </span>
          <span
            className={cn(
              'tnum shrink-0 font-display text-xs font-bold',
              urgent ? 'anim-badge-pulse text-berry' : 'text-cocoa-soft',
            )}
          >
            ⏱ {leftSec}с
          </span>
        </div>
        <p className="truncate text-xs font-semibold text-cocoa-soft">
          Готово {order.cooked}/{order.qty}
          {inProgress > 0 && ` · готовится ${inProgress}`} · +{order.reward}🪙 +{order.xp}✨
        </p>
        {/* прогресс порций */}
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-wall">
          <motion.div
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={{ type: 'spring', stiffness: 200, damping: 26 }}
            className={cn('h-full rounded-full', order.cooked >= order.qty ? 'bg-sage' : 'bg-honey')}
          />
        </div>
      </div>
      <GameButton
        variant="buy"
        className="shrink-0 px-3"
        disabled={disabled}
        onClick={() => useGameStore.getState().startDeliveryCooking(order.id, Date.now())}
      >
        {allStarted ? 'Курьер ждёт 🛵' : freeStove ? 'Готовить' : 'Плиты заняты'}
      </GameButton>
    </motion.div>
  )
}

/**
 * Панель «Доставка 🛵»: активные заказы с прогрессом порций и таймером дедлайна.
 * Кнопка «Готовить» ставит порцию на свободную плиту; дизейбл, если плит нет.
 */
export default function DeliveryPanel() {
  const deliveries = useGameStore((s) => s.deliveries)
  const level = useGameStore((s) => s.level)
  const mode = useGameStore((s) => s.mode)
  const items = useGameStore((s) => s.items)
  const kitchenJobs = useGameStore((s) => s.kitchenJobs)

  // локальный поллинг 500мс — тикает таймер дедлайна
  const [, force] = useReducer((x: number) => x + 1, 0)
  useEffect(() => {
    const id = setInterval(force, 500)
    return () => clearInterval(id)
  }, [])

  // свободная плита: на ней нет ни одного job (готовящегося или готового)
  const busy = new Set(kitchenJobs.map((j) => j.stoveUid))
  const freeStove = items.some((p) => getItem(p.itemId)?.isStove && !busy.has(p.uid))

  if (level < DELIVERY_MIN_LEVEL) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-center">
        <p className="font-display text-sm font-bold text-cocoa-soft">
          🛵 Доставка откроется со {DELIVERY_MIN_LEVEL} уровня 🔒
        </p>
      </div>
    )
  }

  if (!deliveries.length) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-center">
        <p className="font-display text-sm font-bold text-cocoa-soft">
          🛵 Пока заказов нет — курьер уже в пути…
        </p>
      </div>
    )
  }

  return (
    <div className="relative h-full overflow-y-auto">
      <div className="flex flex-col gap-2 pr-1">
        {deliveries.map((d, i) => (
          <DeliveryCard
            key={d.id}
            order={d}
            index={i}
            freeStove={freeStove}
            live={mode === 'live'}
          />
        ))}
      </div>
    </div>
  )
}
