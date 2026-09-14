// RestoCity — типы игрового состояния

export type Zone = 'hall' | 'kitchen' | 'street'
export type ItemCategory = 'table' | 'kitchen' | 'decor' | 'facade'
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
  /** Фасад: +N% к частоте спавна клиентов (аддитивно, кап +20%) */
  facadeBonus?: number
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
  /** Уникальный id слота найма, напр. 'cook_1' / 'cook_2' */
  id: string
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
  /** Слот из STAFF_DEFS; в старых сейвах отсутствует → `${role}_1` */
  defId?: string
}

export type ClientPhase =
  | 'arriving' // идёт от двери к столу
  | 'waiting' // VIP ждёт престижный стол у двери (таймер waitingUntil)
  | 'seated' // сидит, ждёт готовки/подачи
  | 'eating' // ест
  | 'leaving' // довольный, идёт к двери
  | 'angry-leaving' // недовольный, идёт к двери

/** Клетка пути (waypoint) */
export interface PathCell {
  x: number
  y: number
}

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
  /** Индекс кресла за столом (0..seats-1) */
  seatIndex?: number
  /** Направление взгляда при ходьбе: 1 вправо / -1 влево (по экрану) */
  facing?: number
  /** Оставшиеся waypoints пути (tx/ty — текущая цель); пустой/нет — прямое движение */
  path?: PathCell[]
  /** id группы (= id клиента-лидера); у одиночек — undefined */
  partyId?: string
  /** Размер группы (>1); заказ/оплата идут через лидера */
  partySize?: number
  /** VIP-клиент: чек ×3, +10⭐, хочет стол рядом с декором */
  vip?: boolean
  /** Максимальное терпение (для прогресс-бара); у VIP = 45с */
  patienceMax?: number
  /** Момент (ms), до которого VIP ждёт престижный стол у двери */
  waitingUntil?: number
  /** Фаза eating: старт/конец трапезы (ms, Date.now); длительность ровно 15с */
  eatStart?: number
  eatEnd?: number
}

export type NpcPhase =
  | 'idle' // стоит на своём месте
  | 'to-stove' // идёт к плите (повар — готовить, официант — забрать блюдо)
  | 'to-table' // официант несёт блюдо к столу
  | 'working' // повар работает у плиты

/** Подвижный NPC персонала (повар/официант) */
export interface StaffNpc {
  x: number
  y: number
  tx: number
  ty: number
  path: PathCell[]
  phase: NpcPhase
  /** job, который официант несёт/идёт забирать */
  jobId?: string
  /** плита, у которой работает повар */
  stoveUid?: string
  facing?: number
}

/** Прохожий на тротуаре: чистая анимация, на экономику не влияет */
export interface Pedestrian {
  id: string
  x: number
  y: number
  /** Конечная точка маршрута (за краем сцены) */
  tx: number
  ty: number
  /** walk — идёт вдоль тротуара; peek — «заглядывает»: повернул к двери и тает */
  state: 'walk' | 'peek'
  /** Шанс «заглянуть» уже брошен (один раз за проход) */
  peekRolled?: boolean
  /** Момент (ms), после которого peek-пешеход исчезает */
  fadeAt?: number
  /** Спрайт customer_1..3 */
  sprite: string
  facing: number
}

/** Задание на кухне: готовка блюда для клиента или заказа-доставки */
export interface KitchenJob {
  id: string
  /** id клиента; для delivery-jobs — служебная строка `delivery:<id>` */
  clientId: string
  /** Тип задания; undefined трактуется как клиентский заказ */
  kind?: 'client' | 'delivery'
  /** id заказа-доставки (только kind='delivery') */
  deliveryId?: string
  /** Плита готовки; '' = блюдо снято с плиты (официант несёт / у игрока в руках) */
  stoveUid: string
  startedAt: number
  /** Длительность, сек */
  duration: number
  ready: boolean
  /** Момент готовности (ms) — база для бонуса «идеальное обслуживание» */
  readyAt?: number
}

/** Заказ-доставка 🛵: порции готовятся на свободных плитах, забирает курьер */
export interface DeliveryOrder {
  id: string
  /** Эмодзи блюда (из ORDER_EMOJIS) */
  dish: string
  /** Всего порций */
  qty: number
  /** Готово порций (курьер забрал) */
  cooked: number
  /** Награда в монетах за весь заказ */
  reward: number
  /** Награда в XP за весь заказ */
  xp: number
  /** Дедлайн (ms, Date.now) */
  expiresAt: number
  state: 'active' | 'done' | 'failed'
}

export interface Quest {
  id: string
  title: string
  description: string
  target: number
  progress: number
  /** Награда в монетах */
  reward: number
  /** Награда в XP (квесты дают опыт) */
  xpReward?: number
  /** Награда в кристаллах 💎 (сюжетные квесты) */
  gemReward?: number
  /** Ключ статистики, по которой считается прогресс */
  stat?: keyof GameStats
  /** Ежедневный квест (перевыпускается в 00:00 мск) */
  daily?: boolean
  /** Сюжетный квест: уровень, на котором открывается (до этого — заблокирован) */
  unlockLevel?: number
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

/** Грязь: пятно на столе или лужа на полу */
export interface Stain {
  id: string
  /** Клетка-якорь (как у PlacedItem) */
  x: number
  y: number
  kind: 'table' | 'floor'
  /** uid стола (только для kind='table') */
  tableUid?: string
  createdAt: number
  /** Идёт уборка (тап игрока 1.5с / уборщик ~6с) */
  cleaning?: { startedAt: number; durationMs: number; by: 'player' | 'cleaner' }
}

/** Счётчики для квестов */
export interface GameStats {
  servedClients: number
  goodReviews: number
  tablesBought: number
  decorPlaced: number
  cooksHired: number
  /** Приготовлено блюд (стартов готовки) */
  dishesCooked: number
  /** Заработано монет с клиентов */
  coinsEarned: number
  /** Куплено предметов (любых) */
  itemsBought: number
  /** Убрано пятен грязи */
  stainsCleaned: number
  /** Обслужено VIP-клиентов (без разворота) */
  vipServed: number
  /** Нанято сотрудников (всего) */
  staffHired: number
  /** Нанято официантов */
  waitersHired: number
  /** Нанято уборщиков */
  cleanersHired: number
  /** Куплено ингредиентов на рынке (шт) */
  ingredientsBought: number
  /** Куплено плит (точек готовки) */
  stovesBought: number
  /** Размещено предметов фасада */
  facadePlaced: number
  /** Максимум посадочных мест за всё время */
  seatsMax: number
  /** Максимум достигнутого уровня */
  levelReached: number
  /** Максимум атмосферы, % */
  maxAtmosphere: number
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
  /** Прохожие на улице (не сериализуется в сейв) */
  pedestrians: Pedestrian[]
  kitchenJobs: KitchenJob[]
  /** NPC поваров (по одному на каждый нанятый слот cook) */
  cooks: StaffNpc[]
  /** NPC официантов (по одному на каждый нанятый слот waiter) */
  waiters: StaffNpc[]
  /** Активная грязь в зале (не сериализуется в сейв) */
  stains: Stain[]
  quests: Quest[]
  /** Ежедневные квесты (3 слота, сброс в 00:00 мск) */
  dailyQuests: Quest[]
  /** Дата выпуска ежедневных квестов (YYYY-MM-DD по Москве, UTC+3) */
  dailyDate: string
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
  /** Час пик: активен ли прямо сейчас (не сериализуется) */
  rushActive: boolean
  /** Момент окончания часа пик (ms, Date.now) */
  rushEndsAt: number
  /** Заказы-доставки (в списке — только активные) */
  deliveries: DeliveryOrder[]
  /** Момент появления следующего заказа-доставки (ms), 0 = не назначен */
  nextDeliveryAt: number
  /** метка последнего автосохранения */
  savedAt: number
  onboardingDone: boolean
  /** Текстовое обучение пройдено/пропущено (persist; старые сейвы → true) */
  tutorialDone: boolean
  /** Запасы ингредиентов: ingredientId → кол-во (рынок, см. market.ts) */
  inventory: Record<string, number>
  /** Уровни плит: stoveUid → 1..5 (скорость ×0.85^(level-1)); persist, миграция → 1 */
  stoveLevels: Record<string, number>
  /** uid плиты с открытым попапом апгрейда (тап по плите), null = закрыт */
  stovePopupUid: string | null
}
