// RestoCity — типы игрового состояния

export type Zone = 'hall' | 'kitchen'
export type ItemCategory = 'table' | 'kitchen' | 'decor'
export type GameMode = 'live' | 'build'

/** Элемент каталога магазина */
export interface CatalogItem {
  id: string
  name: string
  emoji: string
  category: ItemCategory
  zone: Zone
  /** Цена в монетах */
  price: number
  /** Минимальный уровень для покупки */
  level: number
  /** Размер в тайлах */
  w: number
  h: number
  /** Посадочных мест (только столы) */
  seats?: number
  /** Бонус атмосферы, % (декор) */
  atmosphere?: number
  /** Множитель скорости готовки, напр. 0.9 = +10% скорости */
  cookTimeFactor?: number
  /** +N одновременных заказов */
  extraOrders?: number
  /** Вторая точка готовки */
  isStove?: boolean
  description: string
}

/** Размещённый на сцене предмет */
export interface PlacedItem {
  uid: string
  itemId: string
  x: number
  y: number
}

export type StaffRole = 'cook' | 'waiter' | 'cleaner'

export interface StaffDef {
  role: StaffRole
  name: string
  emoji: string
  level: number
  cost: number
  bonus: string
}

export interface StaffMember {
  role: StaffRole
  hiredAt: number
}

export type ClientPhase =
  | 'arriving' // идёт от двери к столу
  | 'seated' // сидит, ждёт готовки/подачи
  | 'eating' // ест
  | 'leaving' // довольный, идёт к двери
  | 'angry-leaving' // недовольный, идёт к двери

export interface Client {
  id: string
  x: number
  y: number
  /** Целевая клетка пути */
  tx: number
  ty: number
  phase: ClientPhase
  /** uid стола, за которым сидит */
  tableUid?: string
  /** Эмодзи заказа */
  order: string
  /** Терпение, сек (30 → 0) */
  patience: number
  bodyColor: string
  face: string
  /** Время, когда сел (для бонуса «идеальное обслуживание») */
  seatedAt?: number
}

/** Задание на кухне: готовка блюда для клиента */
export interface KitchenJob {
  id: string
  clientId: string
  stoveUid: string
  startedAt: number
  /** Длительность, сек */
  duration: number
  ready: boolean
  /** Момент готовности (ms) — база для бонуса «идеальное обслуживание» */
  readyAt?: number
}

export interface Quest {
  id: string
  title: string
  description: string
  target: number
  progress: number
  /** Награда в монетах */
  reward: number
  claimed: boolean
}

export type FloatKind = 'coin' | 'xp' | 'rep-down'

export interface FloatText {
  id: string
  x: number
  y: number
  text: string
  kind: FloatKind
}

export interface ToastMsg {
  id: string
  text: string
  kind: 'success' | 'error' | 'info'
}

/** Счётчики для квестов */
export interface GameStats {
  servedClients: number
  goodReviews: number
  tablesBought: number
  decorPlaced: number
  cooksHired: number
}

export interface GameState {
  coins: number
  gems: number
  xp: number
  level: number
  reputation: number
  items: PlacedItem[]
  staff: StaffMember[]
  clients: Client[]
  kitchenJobs: KitchenJob[]
  quests: Quest[]
  stats: GameStats
  floats: FloatText[]
  toasts: ToastMsg[]
  mode: GameMode
  /** itemId предмета «на курсоре» в build mode */
  buildItemId: string | null
  /** uid перемещаемого предмета (build mode) */
  movingUid: string | null
  /** id готового блюда, которое игрок несёт (live mode, без официанта) */
  heldDishId: string | null
  soundOn: boolean
  /** Скорость игры ×1 / ×2 */
  speed: 1 | 2
  /** метка последнего автосохранения */
  savedAt: number
  onboardingDone: boolean
}
