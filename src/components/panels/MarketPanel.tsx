import { motion } from 'framer-motion'
import { DISHES, INGREDIENTS, type DishDef } from '@/game/market'
import { useGameStore } from '@/game/store'
import { DISH_SPRITES, spriteUrl } from '../sprites'
import { cn } from '@/lib/utils'

/** Плашка запаса + кнопки закупки (touch ≥44px, всё в потоке) */
function IngredientRow({
  id,
  index,
  coins,
  stock,
}: {
  id: string
  index: number
  coins: number
  stock: number
}) {
  const def = INGREDIENTS.find((i) => i.id === id)!
  const buy = (qty: number) => useGameStore.getState().buyIngredient(id, qty)
  return (
    <motion.div
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 320, damping: 22, delay: index * 0.04 }}
      className="outline-cozy flex min-w-0 flex-col gap-1.5 overflow-hidden rounded-2xl bg-paper p-2.5 shadow-sticker"
    >
      <div className="flex items-center gap-2">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cream text-2xl leading-none shadow-[inset_0_2px_0_rgba(255,255,255,0.6)]">
          {def.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate font-body text-[0.8125rem] font-bold leading-tight text-cocoa" title={def.name}>
            {def.name}
          </div>
          <div className="tnum text-[0.6875rem] font-semibold text-cocoa-soft">
            {def.price} 🪙/шт · запас: <span className={cn('font-bold', stock > 0 ? 'text-sage' : 'text-berry')}>{stock}</span>
          </div>
        </div>
      </div>
      <div className="flex gap-1.5">
        {[1, 5].map((qty) => {
          const cost = def.price * qty
          const afford = coins >= cost
          return (
            <motion.button
              key={qty}
              type="button"
              whileTap={{ scale: 0.94 }}
              disabled={!afford}
              onClick={() => buy(qty)}
              className={cn(
                'tnum flex min-h-[44px] flex-1 items-center justify-center rounded-xl px-2 font-display text-[0.8125rem] font-bold shadow-sticker outline-cozy transition-colors',
                afford ? 'bg-honey/30 text-cocoa hover:bg-honey/50 active:bg-honey/60' : 'bg-wall text-cocoa-soft opacity-60',
              )}
              title={afford ? `Купить ${qty} шт за ${cost}🪙` : `Не хватает монет (${cost}🪙)`}
            >
              +{qty} · {cost}🪙
            </motion.button>
          )
        })}
      </div>
    </motion.div>
  )
}

/** Карточка рецепта: блюдо, уровень открытия, состав */
function DishCard({ dish, level }: { dish: DishDef; level: number }) {
  const locked = level < dish.level
  const parts = Object.entries(dish.recipe)
  return (
    <div
      className={cn(
        'outline-cozy flex min-w-0 items-center gap-2 overflow-hidden rounded-2xl bg-paper p-2.5 shadow-sticker',
        locked && 'opacity-80',
      )}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-cream text-2xl leading-none shadow-[inset_0_2px_0_rgba(255,255,255,0.6)]">
        {DISH_SPRITES[dish.emoji] ? (
          <img
            src={spriteUrl(DISH_SPRITES[dish.emoji])}
            alt={dish.name}
            draggable={false}
            className="pointer-events-none h-9 w-9 select-none object-contain"
          />
        ) : (
          dish.emoji
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate font-body text-[0.8125rem] font-bold leading-tight text-cocoa" title={dish.name}>
          {dish.emoji} {dish.name}
        </div>
        <div className="flex flex-wrap gap-1 pt-0.5">
          {parts.length === 0 ? (
            <span className="rounded-md bg-cream px-1 py-px text-[0.625rem] font-semibold text-cocoa-soft">
              🏠 домашнее — без ингредиентов
            </span>
          ) : (
            parts.map(([ingId, n]) => {
              const ing = INGREDIENTS.find((i) => i.id === ingId)
              return (
                <span key={ingId} className="rounded-md bg-cream px-1 py-px text-[0.625rem] font-semibold text-cocoa-soft">
                  {ing?.emoji}×{n}
                </span>
              )
            })
          )}
        </div>
      </div>
      {locked && (
        <span className="shrink-0 rounded-lg bg-berry/15 px-1.5 py-0.5 font-display text-[0.6875rem] font-bold text-berry">
          🔒 Ур. {dish.level}
        </span>
      )}
    </div>
  )
}

/** Таб «Рынок 🧺»: закупка ингредиентов + открытые рецепты */
export default function MarketPanel() {
  const coins = useGameStore((s) => s.coins)
  const level = useGameStore((s) => s.level)
  const inventory = useGameStore((s) => s.inventory)

  return (
    <div className="flex h-full flex-col gap-2 overflow-y-auto pr-1">
      <div className="flex items-center gap-2">
        <span className="font-display text-[0.8125rem] font-bold text-cocoa">🧺 Ингредиенты</span>
        <span className="tnum ml-auto shrink-0 rounded-xl bg-honey/20 px-2.5 py-1 font-display text-[0.8125rem] font-bold text-cocoa">
          🪙 {coins}
        </span>
      </div>
      <div
        className="grid auto-rows-min gap-2"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(150px, 100%), 1fr))' }}
      >
        {INGREDIENTS.map((ing, i) => (
          <IngredientRow key={ing.id} id={ing.id} index={i} coins={coins} stock={inventory[ing.id] ?? 0} />
        ))}
      </div>

      <span className="pt-1 font-display text-[0.8125rem] font-bold text-cocoa">📖 Рецепты</span>
      <div className="grid auto-rows-min gap-2 sm:grid-cols-2">
        {DISHES.map((d) => (
          <DishCard key={d.id} dish={d} level={level} />
        ))}
      </div>
    </div>
  )
}
