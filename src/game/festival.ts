// Кулинарный фестиваль 🎪 (локальная адаптация недельного ивента ТЗ §16).
// Каждую ISO-неделю (по московскому времени) — «фестивальное блюдо» из DISHES,
// выбираемое детерминированно от ключа недели. Любое приготовленное блюдо даёт
// +1 порцию фестивалю, совпадение с блюдом недели — +3. Цель: 100 порций,
// награды по вкладу забираются кнопками (см. QuestsPanel, секция «Фестиваль»).
// Смена недели — автоматический сброс прогресса (миграция на лету при чтении).

import { DISHES } from './market'
import type { FestivalState } from './types'

/** Цель недели: порций за неделю */
export const FESTIVAL_TARGET = 100

export interface FestivalTier {
  /** Порог порций для получения награды */
  portions: number
  coins: number
  gems: number
}

/** Награды по вкладу: 10+ / 30+ / 60+ / 100 порций за неделю */
export const FESTIVAL_TIERS: FestivalTier[] = [
  { portions: 10, coins: 200, gems: 0 },
  { portions: 30, coins: 500, gems: 0 },
  { portions: 60, coins: 1000, gems: 5 },
  { portions: 100, coins: 2500, gems: 25 },
]

/** Ключ текущей ISO-недели по московскому времени: YYYY-Www */
export function festivalWeekKey(now = Date.now()): string {
  // ISO-неделя: неделя начинается с понедельника, первая — с первого четверга года
  const d = new Date(now + 3 * 3600_000) // московское время
  const day = (d.getUTCDay() + 6) % 7 // 0 = понедельник
  d.setUTCDate(d.getUTCDate() - day + 3) // четверг этой недели
  const year = d.getUTCFullYear()
  const firstThursday = new Date(Date.UTC(year, 0, 4))
  const ftDay = (firstThursday.getUTCDay() + 6) % 7
  firstThursday.setUTCDate(firstThursday.getUTCDate() - ftDay + 3)
  const week = 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 24 * 3600_000))
  return `${year}-W${String(week).padStart(2, '0')}`
}

/** Детерминированный хэш строки (для выбора блюда недели) */
function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

/** Эмодзи фестивального блюда недели (детерминировано от ключа недели) */
export function festivalDishEmoji(weekKey: string): string {
  return DISHES[hashStr(weekKey) % DISHES.length].emoji
}

/** Определение фестивального блюда недели */
export function festivalDish(weekKey: string) {
  return DISHES.find((d) => d.emoji === festivalDishEmoji(weekKey)) ?? DISHES[0]
}

/** Свежий прогресс фестиваля на текущую неделю */
export function freshFestival(now = Date.now()): FestivalState {
  return { weekKey: festivalWeekKey(now), portions: 0, claimedTiers: [] }
}

/**
 * Миграция на лету: если в сейве неделя не та (или поля битые/отсутствуют) —
 * прогресс сбрасывается на свежий, старые claimedTiers не переносятся.
 */
export function normalizeFestival(f: FestivalState | undefined | null, now = Date.now()): FestivalState {
  const cur = festivalWeekKey(now)
  if (!f || typeof f.weekKey !== 'string' || f.weekKey !== cur) return freshFestival(now)
  return {
    weekKey: f.weekKey,
    portions: typeof f.portions === 'number' && f.portions > 0 ? f.portions : 0,
    claimedTiers: Array.isArray(f.claimedTiers) ? f.claimedTiers.filter((t) => Number.isInteger(t)) : [],
  }
}
