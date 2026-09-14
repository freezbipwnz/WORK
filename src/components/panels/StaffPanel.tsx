import { motion } from 'framer-motion'
import { STAFF_DEFS } from '@/game/catalog'
import { useGameStore } from '@/game/store'
import GameButton from '@/components/ui/GameButton'
import { cn } from '@/lib/utils'

/**
 * Панель «Персонал 👥»: карточки слотов из STAFF_DEFS (по 2 на роль —
 * второй повар с 6 ур., второй официант с 4 ур., второй уборщик с 8 ур.).
 * Найм: useGameStore.getState().hireStaff(role, defId) — стор сам показывает
 * тосты об ошибках (не хватает монет / уровня).
 */
export default function StaffPanel() {
  const coins = useGameStore((s) => s.coins)
  const level = useGameStore((s) => s.level)
  const staff = useGameStore((s) => s.staff)

  return (
    <div className="grid h-full grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-3">
      {STAFF_DEFS.map((def, i) => {
        const hired = staff.some((m) => (m.defId ?? `${m.role}_1`) === def.id)
        const levelLocked = level < def.level
        const canAfford = coins >= def.cost
        const disabled = hired || levelLocked || !canAfford

        return (
          <motion.div
            key={def.id}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              type: 'spring',
              stiffness: 380,
              damping: 20,
              delay: i * 0.04,
            }}
            className={cn(
              'flex flex-col items-center gap-1.5 rounded-2xl border-2 bg-paper p-3 text-center shadow-sticker',
              hired ? 'border-sage/70' : 'border-cocoa/15',
            )}
          >
            <div
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-full border-2 text-3xl',
                hired
                  ? 'border-sage/50 bg-sage/15'
                  : 'border-cocoa/20 bg-cream',
              )}
            >
              {def.emoji}
            </div>
            <div className="font-display text-base font-bold leading-tight text-cocoa">
              {def.name}
              <span className="ml-1.5 text-[0.6875rem] font-semibold text-cocoa-soft">
                ур. {def.level}
              </span>
            </div>
            <p className="min-h-[32px] text-xs font-semibold leading-snug text-cocoa-soft">
              {def.bonus}
            </p>

            {hired ? (
              <span className="inline-flex min-h-[44px] items-center rounded-xl bg-sage/15 px-4 font-display text-[0.9375rem] font-bold text-sage">
                Нанят ✅
              </span>
            ) : levelLocked ? (
              <span className="inline-flex min-h-[44px] items-center rounded-xl bg-[#CFC4B2] px-4 font-display text-[0.9375rem] font-bold text-cocoa-soft">
                🔒 Откроется на {def.level} уровне
              </span>
            ) : (
              <GameButton
                variant="buy"
                disabled={disabled}
                canAfford={canAfford}
                price={def.cost}
                className="w-full"
                onClick={() => useGameStore.getState().hireStaff(def.role, def.id)}
              >
                Нанять
              </GameButton>
            )}
          </motion.div>
        )
      })}
    </div>
  )
}
