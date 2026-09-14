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
    atmosphere: 2,
    description: 'Декор кухни: +2% атмосферы. Скорость готовки теперь растёт с уровнем плиты.',
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
    atmosphere: 2,
    description: 'Декор кухни: +2% атмосферы. Вместительный и блестящий.',
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
  // --- Фасад (ставится только на клетках улицы, см. isFacadeCell) ---
  {
    id: 'flower_bed',
    name: 'Клумба',
    emoji: '🌷',
    category: 'facade',
    zone: 'street',
    price: 400,
    level: 1,
    w: 1,
    h: 1,
    facadeBonus: 4,
    description: '+4% к притоку гостей. Цветы у входа.',
  },
  {
    id: 'signboard',
    name: 'Вывеска',
    emoji: '🪧',
    category: 'facade',
    zone: 'street',
    price: 600,
    level: 2,
    w: 1,
    h: 1,
    facadeBonus: 4,
    description: '+4% к притоку гостей. Заметно издалека.',
  },
  {
    id: 'street_lamp',
    name: 'Уличный фонарь',
    emoji: '🏮',
    category: 'facade',
    zone: 'street',
    price: 800,
    level: 3,
    w: 1,
    h: 1,
    facadeBonus: 4,
    description: '+4% к притоку гостей. Тёплый свет у двери.',
  },
  // --- Набор «Италия» ---
  {
    id: 'table_trattoria',
    name: 'Столик-траттория',
    emoji: '🍽️',
    category: 'table',
    zone: 'hall',
    price: 900,
    level: 5,
    w: 1,
    h: 1,
    seats: 2,
    description: 'Мраморная столешница на двоих. Как в Риме.',
  },
  {
    id: 'table_tuscany',
    name: 'Тосканский стол',
    emoji: '🍇',
    category: 'table',
    zone: 'hall',
    price: 3800,
    level: 12,
    w: 2,
    h: 2,
    seats: 4,
    description: 'Массивный стол из оливкового дерева на четверых.',
  },
  {
    id: 'olive_tree',
    name: 'Оливковое дерево',
    emoji: '🫒',
    category: 'decor',
    zone: 'hall',
    price: 1800,
    level: 9,
    w: 1,
    h: 1,
    atmosphere: 2,
    description: '+2% атмосферы. Кусочек Тосканы в зале.',
  },
  {
    id: 'wine_rack',
    name: 'Винный шкаф',
    emoji: '🍷',
    category: 'decor',
    zone: 'hall',
    price: 2200,
    level: 10,
    w: 2,
    h: 1,
    atmosphere: 2,
    description: '+2% атмосферы. Кьянти урожая лучших лет.',
  },
  {
    id: 'candles',
    name: 'Свечи',
    emoji: '🪔',
    category: 'decor',
    zone: 'hall',
    price: 700,
    level: 6,
    w: 1,
    h: 1,
    atmosphere: 1,
    description: '+1% атмосферы. Мягкий живой свет.',
  },
  // --- Набор «Кафе» ---
  {
    id: 'bar_counter',
    name: 'Барная стойка',
    emoji: '🍸',
    category: 'decor',
    zone: 'hall',
    price: 1600,
    level: 7,
    w: 1,
    h: 1,
    atmosphere: 2,
    description: '+2% атмосферы. Компактная стойка для кофе и болтовни.',
  },
  {
    id: 'coffee_table',
    name: 'Кофейный столик',
    emoji: '☕',
    category: 'table',
    zone: 'hall',
    price: 800,
    level: 4,
    w: 1,
    h: 1,
    seats: 2,
    description: 'Столик для неспешного капучино на двоих.',
  },
  {
    id: 'menu_board',
    name: 'Меню-доска',
    emoji: '📋',
    category: 'decor',
    zone: 'hall',
    price: 650,
    level: 4,
    w: 1,
    h: 1,
    atmosphere: 1,
    description: '+1% атмосферы. Мелом написано «блюдо дня».',
  },
  {
    id: 'display_case',
    name: 'Торговая витрина',
    emoji: '🧁',
    category: 'decor',
    zone: 'hall',
    price: 2400,
    level: 9,
    w: 2,
    h: 1,
    atmosphere: 2,
    description: '+2% атмосферы. Десерты так и манят.',
  },
  // --- Набор «Люкс» ---
  {
    id: 'table_gold',
    name: 'Золотой стол',
    emoji: '👑',
    category: 'table',
    zone: 'hall',
    price: 9000,
    level: 14,
    w: 2,
    h: 2,
    seats: 4,
    description: 'Позолота и бархат. Стол для самых важных гостей.',
  },
  {
    id: 'chandelier',
    name: 'Люстра',
    emoji: '✨',
    category: 'decor',
    zone: 'hall',
    price: 6000,
    level: 12,
    w: 1,
    h: 1,
    atmosphere: 4,
    description: '+4% атмосферы. Хрусталь переливается над залом.',
  },
  {
    id: 'fireplace',
    name: 'Камин',
    emoji: '🔥',
    category: 'decor',
    zone: 'hall',
    price: 7500,
    level: 13,
    w: 2,
    h: 1,
    atmosphere: 4,
    description: '+4% атмосферы. Треск дров и уют.',
  },
  {
    id: 'grand_piano',
    name: 'Рояль',
    emoji: '🎹',
    category: 'decor',
    zone: 'hall',
    price: 12000,
    level: 15,
    w: 2,
    h: 1,
    atmosphere: 5,
    description: '+5% атмосферы. Живая музыка по вечерам.',
  },
  // --- Гем-эксклюзивы (только за 💎, за монеты не продаются: price = 0) ---
  {
    id: 'neon_sign',
    name: 'Неоновая вывеска',
    emoji: '🌟',
    category: 'facade',
    zone: 'street',
    price: 0,
    gemPrice: 15,
    level: 5,
    w: 1,
    h: 1,
    facadeBonus: 8,
    description: '+8% к притоку гостей. Эксклюзив за 💎. Видно с другого конца города!',
  },
  {
    id: 'fountain',
    name: 'Фонтан',
    emoji: '⛲',
    category: 'decor',
    zone: 'hall',
    price: 0,
    gemPrice: 40,
    level: 10,
    w: 2,
    h: 2,
    atmosphere: 6,
    description: '+6% атмосферы. Эксклюзив за 💎. Журчание воды и монетка на счастье.',
  },
  {
    id: 'aqua_maxi',
    name: 'Аквариум-макси',
    emoji: '🐠',
    category: 'decor',
    zone: 'hall',
    price: 0,
    gemPrice: 80,
    level: 12,
    w: 2,
    h: 1,
    atmosphere: 7,
    description: '+7% атмосферы. Эксклюзив за 💎. Целый коралловый риф в зале.',
  },
  {
    id: 'chef_statue',
    name: 'Золотая статуя шефа',
    emoji: '🏆',
    category: 'decor',
    zone: 'hall',
    price: 0,
    gemPrice: 150,
    level: 15,
    w: 1,
    h: 1,
    atmosphere: 9,
    description: '+9% атмосферы. Эксклюзив за 💎. Легенда кухни, отлитая в золоте.',
  },
  // --- Сезонные предметы (фильтрация по сезону — в UI магазина) ---
  {
    id: 'christmas_tree',
    name: 'Ёлка',
    emoji: '🎄',
    category: 'decor',
    zone: 'hall',
    price: 2000,
    level: 5,
    w: 1,
    h: 1,
    atmosphere: 3,
    season: 'winter',
    description: 'Сезонный (зима). +3% атмосферы. Пахнет мандаринами и праздником.',
  },
  {
    id: 'garland',
    name: 'Гирлянда',
    emoji: '🎊',
    category: 'decor',
    zone: 'hall',
    price: 900,
    level: 3,
    w: 1,
    h: 1,
    atmosphere: 2,
    season: 'winter',
    description: 'Сезонный (зима). +2% атмосферы. Огоньки мигают в такт празднику.',
  },
  {
    id: 'veranda_umbrella',
    name: 'Веранда-зонтик',
    emoji: '⛱️',
    category: 'facade',
    zone: 'street',
    price: 1500,
    level: 6,
    w: 1,
    h: 1,
    facadeBonus: 6,
    season: 'summer',
    description: 'Сезонный (лето). +6% к притоку гостей. Тень и прохлада у входа.',
  },
  {
    id: 'flower_arch',
    name: 'Цветочная арка',
    emoji: '💐',
    category: 'facade',
    zone: 'street',
    price: 1800,
    level: 7,
    w: 1,
    h: 1,
    facadeBonus: 6,
    season: 'summer',
    description: 'Сезонный (лето). +6% к притоку гостей. Розы вьются над входом.',
  },
]

export const STAFF_DEFS: StaffDef[] = [
  {
    id: 'cook_1',
    role: 'cook',
    name: 'Повар',
    emoji: '👨‍🍳',
    level: 2,
    cost: 800,
    bonus: 'Готовит в 1.5× быстрее, сам берёт заказы',
  },
  {
    id: 'cook_2',
    role: 'cook',
    name: 'Второй повар',
    emoji: '👩‍🍳',
    level: 6,
    cost: 2000,
    bonus: 'Ещё одни руки у плиты: готовит параллельно',
  },
  {
    id: 'waiter_1',
    role: 'waiter',
    name: 'Официант',
    emoji: '🤵',
    level: 4,
    cost: 1200,
    bonus: 'Сам подаёт готовые блюда',
  },
  {
    id: 'waiter_2',
    role: 'waiter',
    name: 'Второй официант',
    emoji: '🤵‍♀️',
    level: 4,
    cost: 2500,
    bonus: 'Подаёт блюда параллельно с первым',
  },
  {
    id: 'cleaner_1',
    role: 'cleaner',
    name: 'Уборщик',
    emoji: '🧹',
    level: 7,
    cost: 2000,
    bonus: 'Автоматически убирает грязь',
  },
  {
    id: 'cleaner_2',
    role: 'cleaner',
    name: 'Второй уборщик',
    emoji: '🧽',
    level: 8,
    cost: 4000,
    bonus: 'Убирает второе пятно параллельно',
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

// --- Геометрия сцены (базовые размеры — уровень расширения 0) ---
export const HALL_W = 10
export const HALL_H = 8
export const KITCHEN_W = 3
export const TILE = 64
/** Клетка двери (слева от зала) */
export const DOOR = { x: -1, y: 4 }

// --- Расширение помещения (ТЗ §1.2: покупка расширений зала за монеты) ---
export interface ExpansionDef {
  /** Минимальный уровень ресторана для покупки */
  level: number
  /** Цена в монетах */
  price: number
  /** Размер зала после покупки (кухня — всегда KITCHEN_W колонок справа от зала) */
  hallW: number
  hallH: number
  /** Что добавляется (карточка магазина) */
  adds: string
}

/**
 * Ступени расширения по порядку покупки. Кухня остаётся 3 колонками справа
 * от зала и сдвигается вместе с его шириной (см. hallWAt ниже).
 */
export const EXPANSIONS: readonly ExpansionDef[] = [
  { level: 5, price: 800, hallW: 12, hallH: 8, adds: '+2 колонки зала' },
  { level: 10, price: 2500, hallW: 14, hallH: 8, adds: '+2 колонки зала' },
  { level: 15, price: 6000, hallW: 14, hallH: 10, adds: '+2 ряда зала' },
]
export const MAX_EXPANSION = EXPANSIONS.length

/** Ширина зала (клеток) на уровне расширения exp (0 — базовая сетка) */
export function hallWAt(exp: number): number {
  return exp <= 0 ? HALL_W : EXPANSIONS[Math.min(exp, MAX_EXPANSION) - 1].hallW
}
/** Высота зала (клеток) на уровне расширения exp (0 — базовая сетка) */
export function hallHAt(exp: number): number {
  return exp <= 0 ? HALL_H : EXPANSIONS[Math.min(exp, MAX_EXPANSION) - 1].hallH
}
/** Ширина всей сетки проходимости (зал + кухня) на уровне расширения exp */
export function gridWAt(exp: number): number {
  return hallWAt(exp) + KITCHEN_W
}
/** Высота сетки проходимости на уровне расширения exp */
export function gridHAt(exp: number): number {
  return hallHAt(exp)
}

// --- Улица и фасад ---
/** Нижняя площадка у входа: 2 ряда клеток за ближним краем пола + обочина.
 *  Базовые значения (расширение 0): ряды y = 8, 9, обочина y = 10 */
export const STREET_ROWS = [HALL_H, HALL_H + 1] as const // [8, 9]
export const CURB_ROW = HALL_H + 2 // 10 — обочина (темнее, «дорога»)
/** Ряды тротуара на уровне расширения exp (следуют за ближним краем пола) */
export function streetRowsAt(exp: number): readonly [number, number] {
  const hh = hallHAt(exp)
  return [hh, hh + 1]
}
/** Обочина («дорога») на уровне расширения exp */
export function curbRowAt(exp: number): number {
  return hallHAt(exp) + 2
}
/**
 * Левая улица (со стороны двери): полоса ЗА левой стеной, вдоль неё —
 * от верхнего края сцены мимо двери за левый край. Рисуется кодом (StreetLeft)
 * по той же iso-формуле, стена её частично перекрывает. Пешеходы идут по
 * мировой линии x = PED_LANE_X (y растёт PED_LEFT_Y_MIN → PED_LEFT_Y_MAX);
 * линия подобрана так, что ноги прохожего — на тротуаре ЧУТЬ НИЖЕ верхней
 * кромки стены: ноги скрыты стеной, над ней виден торс (человек за зданием),
 * а за торцом стены (X < 0) фигура видна целиком.
 * Границы спавна/деспавна подобраны под расширенную сцену (1120×736,
 * ORIGIN_X=448, ORIGIN_Y=224 — origin по центру максимальной сетки): спавн —
 * фигура целиком за верхним краем (стопы на y<0 при world y≤-11), деспавн —
 * целиком за левым краем.
 */
export const PED_LANE_X = -3.0
/** Спавн пешехода (за верхним краем сцены) */
export const PED_LEFT_Y_MIN = -12.0
/** Деспавн (за левым краем экрана, X < 0, после торца стены) */
export const PED_LEFT_Y_MAX = 13.2
/** Ряд двери на левой улице — здесь прохожий может «заглянуть» */
export const PED_DOOR_ROW = DOOR.y // 4
/**
 * Фасадная зона: клетки первого ряда тротуара рядом с колонной двери.
 * (Колонки x<0 в этой проекции перекрыты левой стеной, поэтому зона —
 * на видимом ближнем краю у входа.) Базовая зона (расширение 0): y = 8.
 */
export const FACADE_ZONE = { y: HALL_H, x0: 1, x1: 4 } as const
/** Фасадная зона на уровне расширения exp (ряд тротуара следует за полом) */
export function facadeZoneAt(exp: number): { y: number; x0: number; x1: number } {
  return { y: hallHAt(exp), x0: FACADE_ZONE.x0, x1: FACADE_ZONE.x1 }
}

/** Клетка входит в фасадную зону (только здесь можно ставить предметы фасада) */
export function isFacadeCell(x: number, y: number, exp: number): boolean {
  const z = facadeZoneAt(exp)
  return y === z.y && x >= z.x0 && x <= z.x1
}

/** Суммарный бонус фасада к частоте спавна клиентов, % (каждый предмет +4, кап +20) */
export function facadeBonusPct(items: { itemId: string }[]): number {
  let sum = 0
  for (const p of items) {
    const def = getItem(p.itemId)
    if (def?.facadeBonus) sum += def.facadeBonus
  }
  return Math.min(20, sum)
}

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
/** Шанс, что вместо одиночки придёт группа: 30% + 1%/ур, макс 50% */
export function partyChance(level: number): number {
  return Math.min(0.5, 0.3 + 0.01 * level)
}
/** Скидка за компанию: чек группы = базовый × 0.9 × N */
export const PARTY_CHECK_FACTOR = 0.9
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
/** Шанс спавна VIP-клиента: с 3 уровня 5% + 1%/уровень (макс 15%) */
export function vipChance(level: number): number {
  if (level < 3) return 0
  return Math.min(0.15, 0.05 + 0.01 * level)
}
/** Продолжительность готовки, сек: база 6–10, повар ×(1/1.5),
 *  уровень плиты: ×0.85^(level-1). Разделочный стол/холодильник — декор, эффекта не дают */
export function cookDuration(hasCook: boolean, stoveLevel = 1): number {
  let d = 6 + Math.random() * 4
  if (hasCook) d /= 1.5
  d *= stoveSpeedFactor(stoveLevel)
  return d
}

// --- Уровни плиты ---
export const STOVE_MAX_LEVEL = 5
/** Множитель времени готовки плиты уровня N: 0.85^(N-1) */
export function stoveSpeedFactor(level: number): number {
  return Math.pow(0.85, Math.max(1, Math.min(STOVE_MAX_LEVEL, level)) - 1)
}
/** Цена апгрейда плиты с уровня N на N+1: ~150×N^1.5 (целые монеты) */
export function stoveUpgradeCost(level: number): number {
  return Math.round(150 * Math.pow(level, 1.5))
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
  { title: 'Чистюля', description: 'Убери 5 пятен грязи', stat: 'stainsCleaned', target: 5, reward: 150, xpReward: 30 },
  // --- Квесты по счётчикам доставки/чаевых/групп/VIP ---
  { title: 'Курьерский день', description: 'Собери 2 доставки 🛵', stat: 'deliveriesDone', target: 2, reward: 150, xpReward: 40 },
  { title: 'Щедрые гости', description: 'Получи 100🪙 чаевых', stat: 'tipsEarned', target: 100, reward: 120, xpReward: 35 },
  { title: 'Компания за столом', description: 'Обслужи 2 группы гостей', stat: 'groupsServed', target: 2, reward: 150, xpReward: 40 },
  { title: 'VIP-день', description: 'Обслужи 1 VIP 👑', stat: 'vipServed', target: 1, reward: 200, xpReward: 50 },
]

/** Ключ даты по Москве (UTC+3): YYYY-MM-DD */
export function mskDateKey(now = Date.now()): string {
  const d = new Date(now + 3 * 3600_000)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

// --- Сезонность предметов каталога ---
export type Season = NonNullable<CatalogItem['season']>

const SEASON_MONTHS: Record<Season, number[]> = {
  winter: [12, 1, 2],
  spring: [3, 4, 5],
  summer: [6, 7, 8],
  autumn: [9, 10, 11],
}

/** Текущий сезон по месяцу московского времени */
export function currentSeason(now = Date.now()): Season {
  const month = Number(mskDateKey(now).slice(5, 7))
  for (const [season, months] of Object.entries(SEASON_MONTHS)) {
    if (months.includes(month)) return season as Season
  }
  return 'winter'
}

/** Сезонный предмет доступен только в свой сезон; обычные — всегда */
export function isSeasonActive(item: CatalogItem, now = Date.now()): boolean {
  return !item.season || item.season === currentSeason(now)
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
/**
 * Экранное смещение (px) → эквивалентное смещение в изо-клетках.
 * Инверсия iso-формул для дельт: px = (dx−dy)·(TILE/2), py = (dx+dy)·(TILE/4).
 * Нужно для z-order кресел/сидящих: глубина считается от фактической
 * посадочной точки (seatOffset), а не от клетки-якоря предмета.
 * (Литералы 32/16 = TILE/2 и TILE/4 — импорт iso.ts сюда нельзя: цикл.)
 */
export function pxOffsetToCells(ox: number, oy: number): { dx: number; dy: number } {
  return { dx: (ox / 32 + oy / 16) / 2, dy: (oy / 16 - ox / 32) / 2 }
}

/**
 * Смещения кресел в экранных px от изо-центра стола, по числу мест.
 * Каждое кресло стоит на своей изо-стороне и разворачивается СИДЕНЬЕМ к столу
 * (спинкой наружу): ориентация выводится из знака ox в компоненте Chairs
 * (спрайт chair.png смотрит влево → кресло слева от стола зеркалится).
 */
export function seatOffsets(seats: number, wCells: number): [number, number][] {
  if (seats <= 2) {
    // 1×1 стол: два кресла с ПРОТИВОПОЛОЖНЫХ сторон (влево/вправо по экрану),
    // развёрнуты друг к другу лицом (оба — к центру стола)
    return [
      [-36, 6],
      [36, 6],
    ]
  }
  // 2×2 стол: 4 кресла по «сторонам света» изометрии — диагонали от центра:
  // влево-вверх, вправо-вверх, влево-вниз, вправо-вниз; каждое смотрит в центр
  const rx = 34 + wCells * 10
  const ry = Math.round(rx / 2)
  return [
    [-rx, -ry],
    [rx, -ry],
    [-rx, ry],
    [rx, ry],
  ]
}
