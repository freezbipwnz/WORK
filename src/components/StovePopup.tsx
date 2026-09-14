import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '@/game/store'
import {
  STOVE_MAX_LEVEL,
  getItem,
  stoveSpeedFactor,
  stoveUpgradeCost,
} from '@/game/catalog'
import GameButton from '@/components/ui/GameButton'
import { cn } from '@/lib/utils'

/**
 * Попап плиты (тап по свободной плите в live-режиме): уровень (звёзды),
 * текущая/следующая скорость готовки, кнопка апгрейда.
 * Закрытие — тапом вне карточки. См. правило тапа в store.clickStove.
 */
export default function StovePopup() {
  const uid = useGameStore((s) => s.stovePopupUid)
  const coins = useGameStore((s) => s.coins)
  const level = useGameStore((s) => (s.stovePopupUid ? s.stoveLevel(s.stovePopupUid) : 1))
  const item = useGameStore((s) =>
    s.stovePopupUid ? s.items.find((i) => i.uid === s.stovePopupUid) : undefined,
  )
  const def = item ? getItem(item.itemId) : undefined

  const open = !!uid && !!item && !!def
  const maxed = level >= STOVE_MAX_LEVEL
  const cost = maxed ? 0 : stoveUpgradeCost(level)
  const canAfford = coins >= cost
  // скорость: доля времени готовки от базовой (меньше = быстрее)
  const curPct = Math.round(stoveSpeedFactor(level) * 100)
  const nextPct = maxed ? curPct : Math.round(stoveSpeedFactor(level + 1) * 100)

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="stove-popup-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-[65] flex items-end justify-center pb-4"
          onClick={() => useGameStore.getState().selectStove(null)} // тап вне — закрыть
        >
          <motion.div
            initial={{ scale: 0.6, opacity: 0, y: 24 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 12 }}
            transition={{ type: 'spring', stiffness: 400, damping: 22 }}
            className="pointer-events-auto flex w-[280px] max-w-[92vw] flex-col items-center gap-2 rounded-2xl border-2 border-cocoa/15 bg-paper p-4 text-center shadow-panel"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <div className="text-3xl">{def!.emoji}</div>
            <div className="font-display text-lg font-bold leading-tight text-cocoa">
              {def!.name}
            </div>

            {/* уровень — звёзды */}
            <div className="flex gap-1 text-lg leading-none" aria-label={`Уровень ${level}`}>
              {Array.from({ length: STOVE_MAX_LEVEL }, (_, i) => (
                <span key={i} className={i < level ? 'text-honey' : 'text-cocoa/20'}>
                  ★
                </span>
              ))}
            </div>

            <div className="text-xs font-semibold text-cocoa-soft">
              Время готовки: {curPct}% от базы
              {!maxed && (
                <>
                  {' → '}
                  <span className="text-sage">{nextPct}% после апгрейда</span>
                </>
              )}
            </div>

            {maxed ? (
              <span className="inline-flex min-h-[44px] items-center rounded-xl bg-honey/20 px-4 font-display text-[15px] font-bold text-cocoa">
                Максимальный уровень ⭐
              </span>
            ) : (
              <GameButton
                variant="buy"
                disabled={!canAfford}
                canAfford={canAfford}
                price={cost}
                className={cn('w-full')}
                onClick={() => useGameStore.getState().upgradeStove(uid!)}
              >
                Улучшить
              </GameButton>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
