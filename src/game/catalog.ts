import type { CatalogItem, StaffDef } from './types'

// Каталог предметов (info.md «Стартовый каталог» + game.md §3.2)

export const CATALOG: CatalogItem[] = [
  // --- Столы ---
  {
    id: 'table_folding',
    name: 'Складной столик',
    emoji: '🪑',
    category: 'table',
    zone: 'hall',
    price: 300,
    level: 1,
    w: 1,
    h: 1,
    seats: 2,
    description: 'Круглый столик на двоих. Простой и уютный.',
  },
  {
    id: 'table_wooden',
    name: 'Деревянный стол',
    emoji: '🪵',
    category: 'table',
    zone: 'hall',
    price: 1200,
    level: 3,
    w: 2,
    h: 2,
    seats: 4,
    description: 'Большой стол со скатертью на четверых.',
  },
  {
    id: 'table_italian',
    name: 'Итальянский стол',
    emoji: '🕯️',
    category: 'table',
    zone: 'hall',
    price: 2500,
    level: 10,
    w: 2,
    h: 2,
    seats: 4,
    description: 'Клетчатая скатерть и свеча. Атмосферно!',
  },
  // --- Кухня ---
  {
    id: 'stove_gas',
    name: 'Газовая плита',
    emoji: '🍳',
    category: 'kitchen',
    zone: 'kitchen',
    price: 500,
    level: 1,
    w: 1,
    h: 1,
    isStove: true,
    description: 'Готовит блюда. 4 конфорки и много пара.',
  },
  {
    id: 'cutting_table',
    name: 'Разделочный стол',
    emoji: '🔪',
    category: 'kitchen',
    zone: 'kitchen',
    price: 400,
    level: 1,
    w: 1,
    h: 1,
    cookTimeFactor: 0.9,
    description: '+10% к скорости готовки.',
  },
  {
    id: 'fridge',
    name: 'Холодильник',
    emoji: '🧊',
    category: 'kitchen',
    zone: 'kitchen',
    price: 600,
    level: 1,
    w: 1,
    h: 1,
    extraOrders: 1,
    description: '+1 одновременный заказ.',
  },
  {
    id: 'pizza_oven',
    name: 'Пицца-печь',
    emoji: '🔥',
    category: 'kitchen',
    zone: 'kitchen',
    price: 15000,
    level: 8,
    w: 2,
    h: 2,
    isStove: true,
    description: 'Кирпичный купол. Вторая точка готовки.',
  },
  // --- Декор ---
  {
    id: 'ficus',
    name: 'Фикус',
    emoji: '🪴',
    category: 'decor',
    zone: 'hall',
    price: 250,
    level: 1,
    w: 1,
    h: 1,
    atmosphere: 1,
    description: '+1% атмосферы. Качает листьями.',
  },
  {
    id: 'painting',
    name: 'Картина',
    emoji: '🖼️',
    category: 'decor',
    zone: 'hall',
    price: 500,
    level: 2,
    w: 1,
    h: 1,
    atmosphere: 1,
    description: '+1% атмосферы. Висит у стены.',
  },
  {
    id: 'floor_lamp',
    name: 'Торшер',
    emoji: '💡',
    category: 'decor',
    zone: 'hall',
    price: 800,
    level: 3,
    w: 1,
    h: 1,
    atmosphere: 1,
    description: '+1% атмосферы. Тёплый свет.',
  },
  {
    id: 'aquarium',
    name: 'Аквариум',
    emoji: '🐟',
    category: 'decor',
    zone: 'hall',
    price: 4000,
    level: 6,
    w: 2,
    h: 1,
    atmosphere: 3,
    description: '+3% атмосферы. Пузыри и рыбки.',
  },
]

export const STAFF_DEFS: StaffDef[] = [
  {
    role: 'cook',
    name: 'Повар',
    emoji: '👨‍🍳',
    level: 2,
    cost: 800,
    bonus: 'Готовит в 1.5× быстрее, сам берёт заказы',
  },
  {
    role: 'waiter',
    name: 'Официант',
    emoji: '🤵',
    level: 4,
    cost: 1200,
    bonus: 'Сам подаёт готовые блюда',
  },
  {
    role: 'cleaner',
    name: 'Уборщик',
    emoji: '🧹',
    level: 7,
    cost: 2000,
    bonus: 'Держит зал в чистоте',
  },
]

export const ORDER_EMOJIS = ['🍕', '🍝', '🥗', '🍰', '🍔', '🍣']

export const CLIENT_FACES = ['🧑', '🧑‍🦱', '👩', '👵', '👴', '👱‍♀️']

export const CLIENT_COLORS = [
  '#D9835B',
  '#8FAE7C',
  '#8FB8C9',
  '#E8B44A',
  '#C96F6F',
  '#B07F52',
  '#A68BB0',
]

export function getItem(id: string): CatalogItem | undefined {
  return CATALOG.find((i) => i.id === id)
}

// --- Геометрия сцены ---
export const HALL_W = 10
export const HALL_H = 8
export const KITCHEN_W = 3
export const TILE = 64
/** Клетка двери (слева от зала) */
export const DOOR = { x: -1, y: 4 }

// --- Формулы экономики (info.md) ---
/** XP для перехода N → N+1: 60 × N^1.7 (быстрый старт, крутой рост потом) */
export function xpTarget(level: number): number {
  return Math.round(60 * Math.pow(level, 1.7))
}
/** Средний чек: 8 + 1.5 × уровень */
export function checkAmount(level: number): number {
  return 8 + 1.5 * level
}
/** Клиентов/мин: 0.9 + 0.06 × уровень */
export function clientsPerMinute(level: number): number {
  return 0.9 + 0.06 * level
}
/** Лимит одновременных клиентов в зале (кроме ограничения по местам) */
export function maxConcurrentClients(level: number): number {
  return 3 + level
}
/** Репутация за клиента: ≈ 2 + уровень/10 */
export function repPerClient(level: number): number {
  return 2 + level / 10
}
/** XP за обслуженного клиента: 5 + уровень/5 */
export function xpPerClient(level: number): number {
  return Math.round(5 + level / 5)
}
/**
 * Чаевые: 5–20% от чека, масштабируются атмосферой (декор +%, макс +50%).
 * atmosphere — суммарный % от декора.
 */
export function tipAmount(check: number, atmosphere: number): number {
  const rate = 0.05 + 0.15 * Math.min(1, atmosphere / 50)
  return Math.round(check * rate * (0.8 + Math.random() * 0.4))
}
/** Продолжительность готовки, сек: 6–10, повар ×(1/1.5), разделочный стол +10% скорости */
export function cookDuration(
  hasCook: boolean,
  hasCuttingTable: boolean,
): number {
  let d = 6 + Math.random() * 4
  if (hasCook) d /= 1.5
  if (hasCuttingTable) d *= 0.9
  return d
}
/** Возврат при продаже: 70% цены */
export function sellPrice(price: number): number {
  return Math.round(price * 0.7)
}

// --- Ежедневные квесты ---
import type { GameStats } from './types'

export interface DailyQuestDef {
  title: string
  description: string
  stat: keyof GameStats
  target: number
  reward: number
  xpReward: number
}

/** Пул ежедневных заданий: 3 случайных перевыпускаются в 00:00 мск */
export const DAILY_QUEST_POOL: DailyQuestDef[] = [
  { title: 'Поток гостей', description: 'Обслужи 10 клиентов', stat: 'servedClients', target: 10, reward: 100, xpReward: 30 },
  { title: 'Касса дня', description: 'Заработай 150🪙 с клиентов', stat: 'coinsEarned', target: 150, reward: 100, xpReward: 30 },
  { title: 'Кухня дымится', description: 'Приготовь 8 блюд', stat: 'dishesCooked', target: 8, reward: 120, xpReward: 40 },
  { title: 'Шопинг', description: 'Купи предмет в магазине', stat: 'itemsBought', target: 1, reward: 80, xpReward: 25 },
  { title: 'Вкуснятина!', description: 'Получи 3 отзыва 😋', stat: 'goodReviews', target: 3, reward: 100, xpReward: 30 },
]

/** Ключ даты по Москве (UTC+3): YYYY-MM-DD */
export function mskDateKey(now = Date.now()): string {
  const d = new Date(now + 3 * 3600_000)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

/** 3 случайных ежедневных квеста из пула */
export function rollDailyQuests(): import('./types').Quest[] {
  const pool = [...DAILY_QUEST_POOL]
  const out: import('./types').Quest[] = []
  for (let i = 0; i < 3 && pool.length; i++) {
    const idx = Math.floor(Math.random() * pool.length)
    const def = pool.splice(idx, 1)[0]
    out.push({
      id: `daily_${def.stat}`,
      title: def.title,
      description: def.description,
      stat: def.stat,
      target: def.target,
      progress: 0,
      reward: def.reward,
      xpReward: def.xpReward,
      daily: true,
      claimed: false,
    })
  }
  return out
}

// --- Кресла у столов ---
/** Смещения кресел в экранных px от изо-центра стола, по числу мест */
export function seatOffsets(seats: number, wCells: number): [number, number][] {
  if (seats <= 2) {
    // 1×1 стол: кресла слева и снизу
    return [
      [-30, 8],
      [0, 16],
    ]
  }
  // 2×2 стол: 4 кресла по сторонам
  const r = 34 + wCells * 12
  return [
    [-r, 0],
    [0, -Math.round(r / 2)],
    [r, 0],
    [0, Math.round(r / 2) + 8],
  ]
}
