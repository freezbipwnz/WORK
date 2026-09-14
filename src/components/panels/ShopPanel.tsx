import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { CATALOG } from '@/game/catalog'
import { useGameStore } from '@/game/store'
import type { CatalogItem, ItemCategory } from '@/game/types'
import GameButton from '../ui/GameButton'
import { ITEM_SPRITES, spriteUrl } from '../sprites'
import { cn } from '@/lib/utils'

type CatFilter = 'all' | ItemCategory

const CATEGORIES: { id: CatFilter; icon: string; label: string }[] = [
  { id: 'all', icon: '✨', label: 'Всё' },
  { id: 'table', icon: '🪑', label: 'Столы' },
  { id: 'kitchen', icon: '🍳', label: 'Кухня' },
  { id: 'decor', icon: '🌸', label: 'Декор' },
]

/** Чипы эффектов предмета (design.md §4.1: места / +% атмосферы / ⚡скорость) */
function effectChips(item: CatalogItem): string[] {
  const chips: string[] = []
  if (item.seats) chips.push(`🪑 ${item.seats} места`)
  if (item.atmosphere) chips.push(`🌸 +${item.atmosphere}%`)
  if (item.cookTimeFactor)
    chips.push(`⚡ +${Math.round((1 - item.cookTimeFactor) * 100)}% скорость`)
  if (item.extraOrders) chips.push(`📋 +${item.extraOrders} заказ`)
  if (item.isStove) chips.push('🍳 готовит')
  return chips
}

interface CardProps {
  item: CatalogItem
  index: number
  coins: number
  level: number
}

function ItemCard({ item, index, coins, level }: CardProps) {
  const locked = level < item.level
  const canAfford = coins >= item.price
  const missing = item.price - coins

  const buy = () => {
    // enterBuildMode сам списывает монеты и валидирует уровень/баланс.
    // Успех → mode 'build', панель табов уступает место режиму расстановки.
    useGameStore.getState().enterBuildMode(item.id)
  }

  return (
    <motion.div
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{
        type: 'spring',
        stiffness: 320,
        damping: 22,
        delay: index * 0.04, // stagger карточек 40ms (game.md §4)
      }}
      className={cn(
        // Жёсткая структура ItemCard (design.md §10): всё в потоке внутри рамки,
        // никаких absolute/отрицательных margin — кнопка не может уехать за край
        'outline-cozy flex min-w-0 flex-col gap-2 overflow-hidden rounded-2xl bg-paper p-3 shadow-sticker',
        locked && 'opacity-90',
      )}
    >
      {/* Шапка: эмодзи-превью в рамке + бейджи в потоке */}
      <div className="flex items-start justify-between gap-1">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-cream text-[26px] leading-none shadow-[inset_0_2px_0_rgba(255,255,255,0.6)]">
          {ITEM_SPRITES[item.id] ? (
            <img
              src={spriteUrl(ITEM_SPRITES[item.id])}
              alt={item.name}
              draggable={false}
              className="pointer-events-none h-11 w-11 select-none object-contain"
            />
          ) : (
            item.emoji
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          {locked && (
            <span className="rounded-lg bg-berry/15 px-1.5 py-0.5 font-display text-[11px] font-bold text-berry">
              🔒 Ур. {item.level}
            </span>
          )}
          <span className="rounded-lg bg-wall px-1.5 py-0.5 text-[11px] font-bold text-cocoa-soft">
            {item.w}×{item.h}
          </span>
        </div>
      </div>

      {/* Название: одна строка, ellipsis */}
      <div className="truncate font-body text-[13px] font-bold leading-tight text-cocoa" title={item.name}>
        {item.name}
      </div>

      {/* Статы-чипы: мелкие, переносятся */}
      <div className="flex flex-wrap gap-1">
        {effectChips(item).map((c) => (
          <span
            key={c}
            className="rounded-md bg-cream px-1 py-px text-[10px] font-semibold text-cocoa-soft"
          >
            {c}
          </span>
        ))}
      </div>

      {/* Цена */}
      <div className="mt-auto flex items-baseline justify-between gap-1">
        <span
          className={cn(
            'tnum font-display text-[15px] font-bold',
            locked || canAfford ? 'text-cocoa' : 'text-berry',
          )}
        >
          {locked ? `🔒 Ур. ${item.level}` : `${item.price} 🪙`}
        </span>
        {!locked && !canAfford && (
          <span className="text-[11px] font-semibold text-berry">−{missing}🪙</span>
        )}
      </div>

      {/* Кнопка «Купить»: в потоке, во всю ширину карточки, min-height 44px */}
      <GameButton
        variant="buy"
        disabled={locked}
        canAfford={canAfford}
        onClick={buy}
        className="min-h-[44px] w-full px-3 py-1.5 text-[13px]"
      >
        Купить
      </GameButton>
    </motion.div>
  )
}

/** Таб «Магазин 🛒» (game.md §4.1): подкатегории-чипы + каталог ItemCard */
export default function ShopPanel() {
  const [cat, setCat] = useState<CatFilter>('all')
  // Живая реакция на баланс/уровень
  const coins = useGameStore((s) => s.coins)
  const level = useGameStore((s) => s.level)

  const items = useMemo(
    () => CATALOG.filter((i) => cat === 'all' || i.category === cat),
    [cat],
  )

  return (
    <div className="flex h-full flex-col gap-2">
      {/* Подкатегории-чипы */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
        {CATEGORIES.map((c) => (
          <motion.button
            key={c.id}
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={() => setCat(c.id)}
            className={cn(
              'flex min-h-[44px] shrink-0 items-center gap-1 rounded-xl px-3 text-[13px] font-bold shadow-sticker outline-cozy',
              cat === c.id
                ? 'bg-terracotta font-display text-paper'
                : 'bg-paper text-cocoa hover:bg-wall',
            )}
          >
            <span aria-hidden>{c.icon}</span>
            {c.label}
          </motion.button>
        ))}
        <span className="tnum ml-auto shrink-0 rounded-xl bg-honey/20 px-2.5 py-1 font-display text-[13px] font-bold text-cocoa">
          🪙 {coins}
        </span>
      </div>

      {/* Каталог: 2 колонки на узком экране, горизонт. переполнение не нужно —
          скролл внутри панели вертикальный */}
      <div
        className="grid min-h-0 flex-1 auto-rows-min gap-2 overflow-y-auto pr-1 sm:gap-3"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(130px, 100%), 1fr))' }}
      >
        {items.map((item, i) => (
          <ItemCard
            key={item.id}
            item={item}
            index={i}
            coins={coins}
            level={level}
          />
        ))}
      </div>
    </div>
  )
}
