// Заказы-доставки 🛵: константы и генерация заказов.
// Логика тика — в simulation.ts (спавн/дедлайны/курьер), UI — panels/DeliveryPanel.tsx.

import type { DeliveryOrder } from './types'
import { checkAmount, xpPerClient } from './catalog'
import { unlockedDishes } from './market'
import { nextUid } from './store'

/** Минимальный уровень для появления доставок */
export const DELIVERY_MIN_LEVEL = 2
/** Максимум одновременно активных заказов */
export const MAX_ACTIVE_DELIVERIES = 2
/** Интервал появления новых заказов: 90–150 сек */
export const DELIVERY_MIN_GAP_MS = 90_000
export const DELIVERY_MAX_GAP_MS = 150_000
/** Дедлайн на выполнение: 60–90 сек */
export const DELIVERY_DEADLINE_MIN_MS = 60_000
export const DELIVERY_DEADLINE_MAX_MS = 90_000
/** Множитель награды за порцию (чек ×1.5) */
export const DELIVERY_REWARD_FACTOR = 1.5
/** Множитель XP (×2 за порцию) */
export const DELIVERY_XP_FACTOR = 2
/** Штраф репутации за проваленный заказ */
export const DELIVERY_REP_PENALTY = 2
/** Если слоты заняты — повторная попытка спавна через 30 сек */
export const DELIVERY_RETRY_MS = 30_000

/** Момент следующего заказа-доставки (ms) */
export function rollNextDelivery(now: number): number {
  return now + DELIVERY_MIN_GAP_MS + Math.random() * (DELIVERY_MAX_GAP_MS - DELIVERY_MIN_GAP_MS)
}

/** Новый случайный заказ: блюдо из открытых, 1–3 порции, награда чек×1.5/порция, XP×2 */
export function rollDeliveryOrder(level: number, now: number): DeliveryOrder {
  const qty = 1 + Math.floor(Math.random() * 3)
  // блюдо строго из открытых по уровню рецептов (рынок)
  const pool = unlockedDishes(level)
  return {
    id: nextUid('dlv'),
    dish: pool[Math.floor(Math.random() * pool.length)].emoji,
    qty,
    cooked: 0,
    reward: Math.round(checkAmount(level) * DELIVERY_REWARD_FACTOR) * qty,
    xp: xpPerClient(level) * DELIVERY_XP_FACTOR * qty,
    expiresAt:
      now + DELIVERY_DEADLINE_MIN_MS + Math.random() * (DELIVERY_DEADLINE_MAX_MS - DELIVERY_DEADLINE_MIN_MS),
    state: 'active',
  }
}
