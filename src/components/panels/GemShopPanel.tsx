import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { CATALOG, isSeasonActive } from '@/game/catalog'
import { GEM_OFFERS, useGameStore } from '@/game/store'
import type { CatalogItem } from '@/game/types'
import GameButton from '@/components/ui/GameButton'
import { ITEM_SPRITES, spriteUrl } from '../sprites'
import { cn } from '@/lib/utils'

/** Карточка эксклюзивного предмета за гемы (покупка → «на курсор» в build mode) */
function GemItemCard({
  item,
  index,
  gems,
  level,
}: {
  item: CatalogItem
  index: number
  gems: number
  level: number
}) {
  const locked = level < item.level
  const price = item.gemPrice ?? 0
  const canAfford = gems >= price

  const buy = () => {
    // buyGemItem сам списывает гемы, валидирует уровень и входит в build mode
    useGameStore.getState().buyGemItem(item.id)
  }

  return (
    <motion.div
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 320, damping: 22, delay: index * 0.04 }}
      className={cn(
        'outline-cozy flex min-w-0 flex-col gap-2.5 overflow-hidden rounded-2xl bg-paper p-3 shadow-sticker',
        locked && 'opacity-90',
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-cream text-3xl leading-none shadow-[inset_0_2px_0_rgba(255,255,255,0.6)]">
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
        <div className="flex min-w-0 flex-col items-end gap-1">
          {locked && (
            <span className="shrink-0 whitespace-nowrap rounded-lg bg-berry/15 px-1.5 py-0.5 font-display text-[0.6875rem] font-bold text-berry">
              🔒 Ур. {item.level}
            </span>
          )}
          <span className="shrink-0 whitespace-nowrap rounded-lg bg-sky/20 px-1.5 py-0.5 font-display text-[0.6875rem] font-bold text-cocoa">
            💎 эксклюзив
          </span>
        </div>
      </div>

      <div className="truncate font-body text-[0.8125rem] font-bold leading-tight text-cocoa" title={item.name}>
        {item.name}
      </div>
      <p className="line-clamp-2 text-[0.6875rem] font-semibold text-cocoa-soft">{item.description}</p>

      <div className="mt-auto flex items-baseline justify-between gap-1">
        <span
          className={cn(
            'tnum font-display text-[0.9375rem] font-bold',
            locked || canAfford ? 'text-cocoa' : 'text-berry',
          )}
        >
          {locked ? `🔒 Ур. ${item.level}` : `${price} 💎`}
        </span>
        {!locked && !canAfford && (
          <span className="text-[0.6875rem] font-semibold text-berry">−{price - gems}💎</span>
        )}
      </div>

      <GameButton
        variant="buy"
        disabled={locked}
        canAfford={canAfford}
        onClick={buy}
        className="min-h-[44px] w-full px-3 py-1.5 text-[0.8125rem]"
      >
        Купить за 💎
      </GameButton>
    </motion.div>
  )
}

/** Карточка услуги за гемы */
function ServiceCard({
  emoji,
  title,
  description,
  price,
  gems,
  disabled,
  onBuy,
  index,
}: {
  emoji: string
  title: string
  description: string
  price: number
  gems: number
  disabled?: boolean
  onBuy: () => void
  index: number
}) {
  const canAfford = gems >= price
  return (
    <motion.div
      initial={{ x: 12, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 24, delay: index * 0.04 }}
      className="flex items-center gap-3 rounded-2xl border-2 border-cocoa/15 bg-paper px-3 py-2 shadow-sticker"
    >
      <span className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-cream text-2xl shadow-[inset_0_2px_0_rgba(255,255,255,0.6)]">
        {emoji}
      </span>
      <div className="min-w-0 flex-1">
        <span className="font-display block truncate text-[0.9375rem] font-bold text-cocoa">{title}</span>
        <p className="truncate text-xs font-semibold text-cocoa-soft">{description}</p>
      </div>
      <GameButton
        variant="buy"
        disabled={disabled}
        canAfford={canAfford}
        onClick={onBuy}
        className="shrink-0 px-3 text-[0.8125rem]"
      >
        {price} 💎
      </GameButton>
    </motion.div>
  )
}

/**
 * Таб «Гемы 💎»: эксклюзивный декор каталога (gemPrice) + услуги за кристаллы.
 * Кнопки неактивны при нехватке гемов.
 */
export default function GemShopPanel() {
  const gems = useGameStore((s) => s.gems)
  const level = useGameStore((s) => s.level)
  const speed = useGameStore((s) => s.speed)
  const hasCooking = useGameStore((s) => s.kitchenJobs.some((j) => !j.ready))
  const hasStains = useGameStore((s) => s.stains.length > 0)

  // эксклюзив: предметы каталога с gemPrice (сезонные — только в свой сезон)
  const gemItems = useMemo(() => CATALOG.filter((i) => i.gemPrice && isSeasonActive(i)), [])

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto pr-1">
      <div className="flex items-baseline justify-between px-1">
        <h3 className="font-display text-sm font-extrabold text-cocoa">💎 Магазин за кристаллы</h3>
        <span className="tnum rounded-xl bg-sky/20 px-2.5 py-1 font-display text-[0.8125rem] font-bold text-cocoa">
          💎 {gems}
        </span>
      </div>

      {/* --- Услуги за гемы --- */}
      <div className="flex flex-col gap-2">
        <h4 className="px-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-cocoa-soft">
          ⚡ Услуги
        </h4>
        <ServiceCard
          index={0}
          emoji="⚡"
          title="Мгновенная готовка"
          description="Все блюда на плитах готовы немедленно"
          price={GEM_OFFERS.instantCook}
          gems={gems}
          disabled={!hasCooking}
          onBuy={() => useGameStore.getState().gemInstantCook()}
        />
        <ServiceCard
          index={1}
          emoji="🧹"
          title="Генеральная уборка"
          description="Убрать все пятна и лужи в зале"
          price={GEM_OFFERS.cleanAll}
          gems={gems}
          disabled={!hasStains}
          onBuy={() => useGameStore.getState().gemCleanAll()}
        />
        <ServiceCard
          index={2}
          emoji="⏩"
          title="Ускорение ×2"
          description="Игра идёт вдвое быстрее 5 минут"
          price={GEM_OFFERS.speedBoost}
          gems={gems}
          disabled={speed === 2}
          onBuy={() => useGameStore.getState().gemSpeedBoost()}
        />
        <ServiceCard
          index={3}
          emoji="🪙"
          title={`Купить ${GEM_OFFERS.buyCoinsAmount}🪙`}
          description="Обмен кристаллов на монеты"
          price={GEM_OFFERS.buyCoins}
          gems={gems}
          onBuy={() => useGameStore.getState().gemBuyCoins()}
        />
      </div>

      {/* --- Эксклюзивный декор --- */}
      <div className="flex flex-col gap-2">
        <h4 className="px-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-cocoa-soft">
          🌟 Эксклюзивный декор
        </h4>
        {gemItems.length ? (
          <div
            className="grid auto-rows-min gap-2.5 sm:gap-3"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(160px, 100%), 1fr))' }}
          >
            {gemItems.map((item, i) => (
              <GemItemCard key={item.id} item={item} index={i} gems={gems} level={level} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border-2 border-dashed border-cocoa/15 bg-paper/60 px-3 py-4 text-center text-xs font-semibold text-cocoa-soft">
            Скоро появятся новинки! ✨
          </div>
        )}
      </div>
    </div>
  )
}
