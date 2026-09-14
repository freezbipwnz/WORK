// Достижения 🏆 (RestoCity_Content_v2 §14.3): долгосрочные цели по счётчикам GameStats.
// Прогресс НЕ хранится — считается на лету из stats; в сейве только claimedAchievements (id).

import type { GameStats } from './types'

export type AchievementCategory = 'service' | 'collection' | 'economy' | 'social' | 'prestige'

export interface AchievementDef {
  id: string
  title: string
  description: string
  emoji: string
  category: AchievementCategory
  /** Счётчик статистики, по которому считается прогресс */
  stat: keyof GameStats
  target: number
  /** Награда в монетах */
  reward: number
  /** Награда в кристаллах 💎 (необязательно) */
  gemReward?: number
}

/** Названия категорий для панели достижений */
export const ACHIEVEMENT_CATEGORY_LABELS: Record<AchievementCategory, string> = {
  service: '🔔 Сервис',
  collection: '🖼 Коллекция',
  economy: '💰 Экономика',
  social: '🥂 Гости',
  prestige: '👑 Престиж',
}

export const ACHIEVEMENT_CATEGORY_ORDER: AchievementCategory[] = [
  'service',
  'economy',
  'collection',
  'social',
  'prestige',
]

/** Реестр достижений: id стабильны (claimedAchievements в сейве хранит id) */
export const ACHIEVEMENTS: AchievementDef[] = [
  // ---------- Сервис ----------
  { id: 'ach_serve_100', title: 'Сотня гостей', description: 'Обслужи 100 клиентов', emoji: '🍽️', category: 'service', stat: 'servedClients', target: 100, reward: 500 },
  { id: 'ach_serve_500', title: 'Полтысячи улыбок', description: 'Обслужи 500 клиентов', emoji: '😊', category: 'service', stat: 'servedClients', target: 500, reward: 1500 },
  { id: 'ach_serve_1000', title: 'Тысячная веха', description: 'Обслужи 1000 клиентов', emoji: '🎖️', category: 'service', stat: 'servedClients', target: 1000, reward: 3000, gemReward: 10 },
  { id: 'ach_cook_100', title: 'Стажер года', description: 'Приготовь 100 блюд', emoji: '🍳', category: 'service', stat: 'dishesCooked', target: 100, reward: 600 },
  { id: 'ach_clean_100', title: 'Чистюля', description: 'Убери 100 пятен грязи', emoji: '🧽', category: 'service', stat: 'stainsCleaned', target: 100, reward: 800 },
  { id: 'ach_delivery_10', title: 'Курьерский дайджест', description: 'Выполни 10 доставок 🛵', emoji: '🛵', category: 'service', stat: 'deliveriesDone', target: 10, reward: 600 },
  { id: 'ach_delivery_50', title: 'Логистика мечты', description: 'Выполни 50 доставок 🛵', emoji: '📦', category: 'service', stat: 'deliveriesDone', target: 50, reward: 2000, gemReward: 5 },

  // ---------- Экономика ----------
  { id: 'ach_earn_10000', title: 'Первая десятка тысяч', description: 'Заработай 10 000🪙 с клиентов', emoji: '💵', category: 'economy', stat: 'coinsEarned', target: 10000, reward: 1000 },
  { id: 'ach_earn_100000', title: 'Шестизначная выручка', description: 'Заработай 100 000🪙 с клиентов', emoji: '🤑', category: 'economy', stat: 'coinsEarned', target: 100000, reward: 5000, gemReward: 15 },
  { id: 'ach_tips_1000', title: 'Мастер чаевых', description: 'Получи 1000🪙 чаевых', emoji: '🪙', category: 'economy', stat: 'tipsEarned', target: 1000, reward: 1000, gemReward: 5 },
  { id: 'ach_market_100', title: 'Оптовый барон', description: 'Купи 100 ингредиентов на рынке', emoji: '🧺', category: 'economy', stat: 'ingredientsBought', target: 100, reward: 800 },

  // ---------- Коллекция ----------
  { id: 'ach_decor_10', title: 'Десять штрихов уюта', description: 'Размести 10 предметов декора', emoji: '🌸', category: 'collection', stat: 'decorPlaced', target: 10, reward: 700 },
  { id: 'ach_items_25', title: 'Коллекционер мебели', description: 'Купи 25 предметов в магазине', emoji: '🪑', category: 'collection', stat: 'itemsBought', target: 25, reward: 900 },
  { id: 'ach_facade_5', title: 'Витрина города', description: 'Поставь 5 предметов фасада', emoji: '🏪', category: 'collection', stat: 'facadePlaced', target: 5, reward: 800 },
  { id: 'ach_stoves_3', title: 'Индустриальная кухня', description: 'Купи 3 плиты', emoji: '🔥', category: 'collection', stat: 'stovesBought', target: 3, reward: 900 },

  // ---------- Гости ----------
  { id: 'ach_vip_5', title: 'Пять корон', description: 'Обслужи 5 VIP-клиентов 👑', emoji: '👑', category: 'social', stat: 'vipServed', target: 5, reward: 800, gemReward: 5 },
  { id: 'ach_vip_25', title: 'Кумир элиты', description: 'Обслужи 25 VIP-клиентов 👑', emoji: '💎', category: 'social', stat: 'vipServed', target: 25, reward: 2500, gemReward: 10 },
  { id: 'ach_groups_10', title: 'Душа компании', description: 'Обслужи 10 групп гостей', emoji: '🎉', category: 'social', stat: 'groupsServed', target: 10, reward: 600 },
  { id: 'ach_happy_100', title: 'Сто добрых слов', description: 'Получи 100 хороших отзывов', emoji: '⭐', category: 'social', stat: 'goodReviews', target: 100, reward: 1200 },

  // ---------- Престиж ----------
  { id: 'ach_level_10', title: 'Ресторатор-ветеран', description: 'Достигни 10 уровня', emoji: '🏆', category: 'prestige', stat: 'levelReached', target: 10, reward: 2000, gemReward: 10 },
  { id: 'ach_atmo_50', title: 'Атмосфера праздника', description: 'Достигни 50% атмосферы', emoji: '✨', category: 'prestige', stat: 'maxAtmosphere', target: 50, reward: 1500, gemReward: 5 },
  { id: 'ach_seats_20', title: 'Зал на двадцатку', description: 'Добейся 20 посадочных мест', emoji: '🏛️', category: 'prestige', stat: 'seatsMax', target: 20, reward: 1500 },
  { id: 'ach_staff_6', title: 'Большая команда', description: 'Найми 6 сотрудников', emoji: '👥', category: 'prestige', stat: 'staffHired', target: 6, reward: 1200 },
]

/** Прогресс достижения (0..target) по текущей статистике */
export function achievementProgress(def: AchievementDef, stats: GameStats): number {
  return Math.min(def.target, stats[def.stat] ?? 0)
}

/** true, если достижение выполнено (можно забирать награду) */
export function achievementDone(def: AchievementDef, stats: GameStats): boolean {
  return (stats[def.stat] ?? 0) >= def.target
}
