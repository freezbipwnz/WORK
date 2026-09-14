import { create } from 'zustand'
import type {
  Client,
  DeliveryOrder,
  GameState,
  GameStats,
  KitchenJob,
  PlacedItem,
  Quest,
  StaffMember,
  StaffRole,
  ToastMsg,
} from './types'
import {
  CATALOG,
  STAFF_DEFS,
  STOVE_MAX_LEVEL,
  getItem,
  sellPrice,
  stoveUpgradeCost,
  xpTarget,
  mskDateKey,
  rollDailyQuests,
  HALL_W,
  HALL_H,
  KITCHEN_W,
  isFacadeCell,
} from './catalog'
import { placementKeepsPaths } from './pathfinding'
import { DISHES, getIngredient, initialInventory } from './market'
import { buildStoryQuests, mergeStoryQuests } from './quests'

/**
 * ================= КОНТРАКТ ДЛЯ ДРУГИХ АГЕНТОВ =================
 * Единый стор игры — `useGameStore` (Zustand).
 *
 * ShopPanel:
 *   - читает каталог: `import { CATALOG } from '@/game/catalog'`
 *   - уровень/монеты: `useGameStore((s) => s.level)`, `s.coins`
 *   - покупка: `useGameStore.getState().enterBuildMode(itemId)`
 *     (списывает монеты, входит в build mode с предметом «на курсоре»)
 * StaffPanel:
 *   - определения: `import { STAFF_DEFS } from '@/game/catalog'`
 *   - нанятые: `useGameStore((s) => s.staff)`
 *   - найм: `store.hireStaff(role: StaffRole)`
 * QuestsPanel:
 *   - `useGameStore((s) => s.quests)` — прогресс обновляется автоматически
 *     симуляцией и экшенами стора; награда: `store.claimQuest(questId)`.
 * Прочее:
 *   - атмосфера: `store.atmosphere()` (%)  — производная от декора
 *   - посадочные места: `store.totalSeats()`
 *   - тосты: `store.pushToast(text, kind)`; всплывашки на сцене: `store.spawnFloat(...)`
 * ================================================================
 */

const SAVE_KEY = 'restocity_save_v1'

let uidCounter = 1
export function nextUid(prefix = 'u'): string {
  return `${prefix}_${Date.now().toString(36)}_${uidCounter++}`
}

function initialItems(): PlacedItem[] {
  // Стартовое состояние: 2 складных столика, плита, разделочный стол, холодильник
  return [
    { uid: nextUid('item'), itemId: 'table_folding', x: 2, y: 2 },
    { uid: nextUid('item'), itemId: 'table_folding', x: 6, y: 5 },
    { uid: nextUid('item'), itemId: 'stove_gas', x: HALL_W, y: 2 },
    { uid: nextUid('item'), itemId: 'cutting_table', x: HALL_W + 1, y: 4 },
    { uid: nextUid('item'), itemId: 'fridge', x: HALL_W + 2, y: 5 },
  ]
}

function initialQuests(): Quest[] {
  return buildStoryQuests()
}

function initialStats(): GameStats {
  return {
    servedClients: 0,
    goodReviews: 0,
    tablesBought: 0,
    decorPlaced: 0,
    cooksHired: 0,
    dishesCooked: 0,
    coinsEarned: 0,
    itemsBought: 0,
    stainsCleaned: 0,
    vipServed: 0,
    staffHired: 0,
    waitersHired: 0,
    cleanersHired: 0,
    ingredientsBought: 0,
    stovesBought: 0,
    facadePlaced: 0,
    // стартовая расстановка: 2 складных столика по 2 места
    seatsMax: 4,
    levelReached: 1,
    maxAtmosphere: 0,
  }
}

function syncQuests(quests: Quest[], stats: GameStats): Quest[] {
  return quests.map((q) =>
    q.claimed || !q.stat
      ? q
      : { ...q, progress: Math.min(q.target, stats[q.stat] ?? 0) },
  )
}

/** Синхронизация прогресса и сюжетных, и ежедневных квестов */
function syncAllQuests(s: Pick<GameState, 'quests' | 'dailyQuests' | 'stats'>) {
  return {
    quests: syncQuests(s.quests, s.stats),
    dailyQuests: syncQuests(s.dailyQuests, s.stats),
  }
}

/** Проверка: можно ли поставить предмет (зона + пересечения) */
export function canPlace(
  items: PlacedItem[],
  itemId: string,
  x: number,
  y: number,
  ignoreUid?: string,
): boolean {
  const def = getItem(itemId)
  if (!def) return false
  const inZone =
    def.zone === 'hall'
      ? x >= 0 && y >= 0 && x + def.w <= HALL_W && y + def.h <= HALL_H
      : def.zone === 'street'
        ? // фасад: каждая клетка footprint'а должна быть в фасадной зоне улицы
          Array.from({ length: def.w * def.h }, (_, i) => ({
            cx: x + (i % def.w),
            cy: y + Math.floor(i / def.w),
          })).every((c) => isFacadeCell(c.cx, c.cy))
        : x >= HALL_W &&
          y >= 0 &&
          x + def.w <= HALL_W + KITCHEN_W &&
          y + def.h <= HALL_H
  if (!inZone) return false
  return !items.some((p) => {
    if (p.uid === ignoreUid) return false
    const d = getItem(p.itemId)
    if (!d) return false
    return x < p.x + d.w && x + def.w > p.x && y < p.y + d.h && y + def.h > p.y
  })
}

interface SaveData {
  coins: number
  gems: number
  xp: number
  level: number
  reputation: number
  items: PlacedItem[]
  staff: StaffMember[]
  quests: Quest[]
  dailyQuests: Quest[]
  dailyDate: string
  stats: GameStats
  soundOn: boolean
  onboardingDone: boolean
  /** В старых сейвах поля нет → обучение считается пройденным (миграция) */
  tutorialDone?: boolean
  /** Запасы ингредиентов (рынок); в старых сейвах может отсутствовать */
  inventory?: Record<string, number>
  /** Волна доставок: активные заказы (поля может не быть в старых сейвах) */
  deliveries?: DeliveryOrder[]
  nextDeliveryAt?: number
  /** Уровни плит (волна «ядро кухни»); в старых сейвах нет → все плиты ур.1 */
  stoveLevels?: Record<string, number>
}

export function saveGame(s: GameState) {
  const data: SaveData = {
    coins: s.coins,
    gems: s.gems,
    xp: s.xp,
    level: s.level,
    reputation: s.reputation,
    items: s.items,
    staff: s.staff,
    quests: s.quests,
    dailyQuests: s.dailyQuests,
    dailyDate: s.dailyDate,
    stats: s.stats,
    soundOn: s.soundOn,
    onboardingDone: s.onboardingDone,
    tutorialDone: s.tutorialDone,
    inventory: s.inventory,
    deliveries: s.deliveries,
    nextDeliveryAt: s.nextDeliveryAt,
    stoveLevels: s.stoveLevels,
  }
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data))
  } catch {
    /* ignore quota errors */
  }
}

function loadGame(): Partial<GameState> | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    const d = JSON.parse(raw) as SaveData
    const stats = { ...initialStats(), ...(d.stats ?? {}) }
    // миграция: счётчик levelReached появился позже — восстанавливаем из уровня сейва
    stats.levelReached = Math.max(stats.levelReached, d.level ?? 1)
    // миграция: seatsMax/maxAtmosphere — восстанавливаем из расставленных предметов
    const savedItems = d.items ?? []
    const savedSeats = savedItems.reduce((acc, p) => acc + (getItem(p.itemId)?.seats ?? 0), 0)
    stats.seatsMax = Math.max(stats.seatsMax, savedSeats)
    const savedAtmo = Math.min(50, savedItems.reduce((acc, p) => acc + (getItem(p.itemId)?.atmosphere ?? 0), 0))
    stats.maxAtmosphere = Math.max(stats.maxAtmosphere, savedAtmo)
    return {
      coins: d.coins,
      gems: d.gems,
      xp: d.xp,
      level: d.level,
      reputation: d.reputation ?? 0,
      items: d.items,
      // миграция: у старых сейвов нет defId слота → первый слот роли (`${role}_1`)
      staff: (d.staff ?? []).map((m) => ({ ...m, defId: m.defId ?? `${m.role}_1` })),
      // миграция: сюжетные квесты мержатся с актуальным шаблоном (новые добавляются)
      quests: syncQuests(mergeStoryQuests(d.quests), stats),
      dailyQuests: syncQuests(d.dailyQuests ?? rollDailyQuests(), stats),
      dailyDate: d.dailyDate ?? mskDateKey(),
      stats,
      soundOn: d.soundOn ?? true,
      onboardingDone: d.onboardingDone ?? false,
      // миграция: старые сейвы (без поля) — обучение не показываем
      tutorialDone: d.tutorialDone ?? true,
      // миграция: в сейвах до «Рынка» inventory нет — стартовый запас по 5 шт
      inventory: { ...initialInventory(), ...(d.inventory ?? {}) },
      // миграция: в сейвах до волны доставок поля нет
      deliveries: (d.deliveries ?? []).filter((o) => o.state === 'active'),
      nextDeliveryAt: d.nextDeliveryAt ?? 0,
      // миграция: в сейвах до уровней плит поля нет → все плиты уровня 1 (lookup по умолчанию)
      stoveLevels: d.stoveLevels ?? {},
      savedAt: Date.now(),
    }
  } catch {
    return null
  }
}

export interface GameActions {
  // --- магазин / build mode ---
  enterBuildMode: (itemId?: string) => boolean
  exitBuildMode: () => void
  placeBuildItem: (x: number, y: number) => boolean
  startMoveItem: (uid: string) => void
  sellItem: (uid: string) => void
  cancelBuild: () => void
  // --- live mode взаимодействия ---
  clickStove: (uid: string) => void
  clickTable: (uid: string) => void
  /** Тап по пятну/луже: старт уборки (1.5с, завершение — в simTick) */
  cleanStain: (id: string) => void
  // --- персонал ---
  /** Нанять первый свободный слот роли (2-й повар/официант/уборщик — по уровням, см. STAFF_DEFS) */
  hireStaff: (role: StaffRole, defId?: string) => boolean
  hasStaff: (role: StaffRole) => boolean
  /** Сколько нанято по роли */
  staffCount: (role: StaffRole) => number
  // --- плиты: уровни и попап ---
  /** Уровень плиты 1..5 (по умолчанию 1) */
  stoveLevel: (uid: string) => number
  /** Апгрейд плиты: цена ~150×level^1.5, кап 5, тост */
  upgradeStove: (uid: string) => boolean
  /** Открыть/закрыть попап плиты (null = закрыть) */
  selectStove: (uid: string | null) => void
  // --- квесты ---
  claimQuest: (questId: string) => void
  /** Перевыпуск ежедневных квестов, если по Москве наступили новые сутки */
  ensureDailyQuests: () => void
  // --- экономика / прогресс ---
  addCoins: (n: number) => void
  addGems: (n: number) => void
  addXp: (n: number) => void
  // --- рынок ---
  /** Купить qty шт ингредиента: списывает монеты, кладёт в inventory, тост */
  buyIngredient: (id: string, qty: number) => boolean
  // --- производные ---
  atmosphere: () => number
  totalSeats: () => number
  stoveUids: () => string[]
  maxConcurrentOrders: () => number
  // --- сцена / фидбек ---
  spawnFloat: (x: number, y: number, text: string, kind?: 'coin' | 'xp' | 'rep-down') => void
  pushToast: (text: string, kind?: ToastMsg['kind']) => void
  dismissToast: (id: string) => void
  toggleSound: () => void
  /** Переключение скорости игры ×1 ↔ ×2 */
  toggleSpeed: () => void
  markSaved: () => void
  resetGame: () => void
  completeOnboarding: () => void
  /** Завершить/пропустить текстовое обучение (persist-флаг tutorialDone) */
  completeTutorial: () => void
  // --- симуляция (вызывается из simulation.ts) ---
  simTick: (dtSec: number, now: number) => void
  spawnClient: (now: number) => void
  startCooking: (clientId: string, now: number, stoveUid?: string) => void
  serveDish: (jobId: string, now: number) => void
  /** «Готовить» в панели доставок: старт порции на свободной плите */
  startDeliveryCooking: (deliveryId: string, now: number) => void
}

export type GameStore = GameState & GameActions

function baseState(): GameState {
  return {
    coins: 500,
    gems: 0,
    xp: 0,
    level: 1,
    reputation: 0,
    items: initialItems(),
    staff: [],
    clients: [],
    pedestrians: [],
    kitchenJobs: [],
    // NPC персонала: пустые массивы — инстансы создаются симуляцией при найме (ensureStaffNpcs)
    cooks: [],
    waiters: [],
    stains: [],
    quests: initialQuests(),
    dailyQuests: rollDailyQuests(),
    dailyDate: mskDateKey(),
    stats: initialStats(),
    floats: [],
    toasts: [],
    mode: 'live',
    buildItemId: null,
    movingUid: null,
    heldDishId: null,
    soundOn: true,
    speed: 1,
    rushActive: false,
    rushEndsAt: 0,
    deliveries: [],
    nextDeliveryAt: 0,
    savedAt: 0,
    onboardingDone: false,
    tutorialDone: false,
    inventory: initialInventory(),
    stoveLevels: {},
    stovePopupUid: null,
  }
}

const saved = loadGame()

export const useGameStore = create<GameStore>((set, get) => ({
  ...baseState(),
  ...saved,
  // после загрузки сейва нет живых клиентов — тост приветствия
  toasts: saved
    ? [{ id: nextUid('toast'), text: 'С возвращением! 👋', kind: 'info' as const }]
    : [],

  // ---------- магазин / build ----------

  enterBuildMode: (itemId) => {
    const s = get()
    if (itemId) {
      const def = getItem(itemId)
      if (!def) return false
      if (def.level > s.level) {
        get().pushToast(`Нужен уровень ${def.level} 🔒`, 'error')
        return false
      }
      if (s.coins < def.price) {
        get().pushToast(`Не хватает ${def.price - s.coins}🪙`, 'error')
        return false
      }
      set({ coins: s.coins - def.price })
    }
    set({ mode: 'build', buildItemId: itemId ?? null, movingUid: null, heldDishId: null, stovePopupUid: null })
    pauseRealtimeTimers() // таймеры на реальных часах не дозревают во время build-паузы
    return true
  },

  exitBuildMode: () => {
    // отмена — неразмещённый купленный предмет возвращаем деньгами
    const s = get()
    if (s.buildItemId) {
      const def = getItem(s.buildItemId)
      if (def) set({ coins: s.coins + def.price })
    }
    set({ mode: 'live', buildItemId: null, movingUid: null })
    resumeRealtimeTimers() // сдвигаем startedAt/eatUntil/lastMove на длительность паузы
  },

  placeBuildItem: (x, y) => {
    const s = get()
    const itemId = s.buildItemId ?? (s.movingUid ? s.items.find((i) => i.uid === s.movingUid)?.itemId : undefined)
    if (!itemId) return false
    if (!canPlace(s.items, itemId, x, y, s.movingUid ?? undefined)) return false

    // виртуальная сетка с новым положением предмета — проверяем проходы
    const virtualItems = s.movingUid
      ? s.items.map((i) => (i.uid === s.movingUid ? { ...i, x, y } : i))
      : [...s.items, { uid: '__virtual__', itemId, x, y }]
    if (!placementKeepsPaths(virtualItems)) {
      get().pushToast('Проход заблокирован 🚧', 'error')
      return false // предмет остаётся «на курсоре», покупка не теряется
    }

    let items: PlacedItem[]
    if (s.movingUid) {
      items = s.items.map((i) => (i.uid === s.movingUid ? { ...i, x, y } : i))
      // пятна на перемещённом столе остаются в прошлом
      set({
        items,
        movingUid: null,
        stains: s.stains.filter((st) => st.tableUid !== s.movingUid),
      })
    } else {
      items = [...s.items, { uid: nextUid('item'), itemId, x, y }]
      const def = getItem(itemId)!
      const stats = { ...s.stats }
      if (def.category === 'table') stats.tablesBought += 1
      if (def.category === 'decor') stats.decorPlaced += 1
      if (def.category === 'facade') stats.facadePlaced += 1
      if (def.isStove) stats.stovesBought += 1
      stats.itemsBought += 1
      // производные максимумы: посадочные места и атмосфера после размещения
      const seats = items.reduce((acc, p) => acc + (getItem(p.itemId)?.seats ?? 0), 0)
      if (seats > stats.seatsMax) stats.seatsMax = seats
      const atmo = Math.max(
        0,
        Math.min(50, items.reduce((acc, p) => acc + (getItem(p.itemId)?.atmosphere ?? 0), 0)) -
          2 * s.stains.filter((st) => st.kind === 'floor').length,
      )
      if (atmo > stats.maxAtmosphere) stats.maxAtmosphere = atmo
      set({
        items,
        stats,
        ...syncAllQuests({ ...s, stats }),
        buildItemId: null,
      })
    }
    return true
  },

  startMoveItem: (uid) => {
    const s = get()
    const p = s.items.find((i) => i.uid === uid)
    if (!p) return
    const def = getItem(p.itemId)
    if (!def) return
    // запрет перемещения с активными связями: готовка на плите / клиент за столом
    if (def.isStove && s.kitchenJobs.some((j) => j.stoveUid === uid)) {
      get().pushToast('Нельзя: идёт готовка 👨‍🍳', 'error')
      return
    }
    if (def.seats && s.clients.some((c) => c.tableUid === uid)) {
      get().pushToast('Нельзя: за столом клиент 🙅', 'error')
      return
    }
    set({ movingUid: uid, buildItemId: null })
  },

  sellItem: (uid) => {
    const s = get()
    const p = s.items.find((i) => i.uid === uid)
    if (!p) return
    const def = getItem(p.itemId)
    if (!def) return
    // запрет продажи с активными связями: готовка на плите / клиент за столом
    if (def.isStove && s.kitchenJobs.some((j) => j.stoveUid === uid)) {
      get().pushToast('Нельзя: идёт готовка 👨‍🍳', 'error')
      return
    }
    if (def.seats && s.clients.some((c) => c.tableUid === uid)) {
      get().pushToast('Нельзя: за столом клиент 🙅', 'error')
      return
    }
    const stoveLevels = { ...s.stoveLevels }
    delete stoveLevels[uid] // уровни проданной плиты забываем
    set({
      items: s.items.filter((i) => i.uid !== uid),
      coins: s.coins + sellPrice(def.price),
      movingUid: s.movingUid === uid ? null : s.movingUid,
      stoveLevels,
      stovePopupUid: s.stovePopupUid === uid ? null : s.stovePopupUid,
      // пятна на проданном столе исчезают вместе с ним
      stains: s.stains.filter((st) => st.tableUid !== uid),
    })
    get().pushToast(`Продано: +${sellPrice(def.price)}🪙`, 'info')
  },

  cancelBuild: () => {
    const s = get()
    if (s.buildItemId) {
      const def = getItem(s.buildItemId)
      if (def) set({ coins: s.coins + def.price })
    }
    set({ buildItemId: null, movingUid: null })
  },

  // ---------- live mode ----------

  clickStove: (uid) => {
    // ПРАВИЛО ТАПА ПО ПЛИТЕ (live-режим):
    //  1) на плите готовится блюдо → тост «Ещё готовится» (попап не открываем);
    //  2) блюдо готово: нет официанта — игрок забирает блюдо (ручная подача сохранена);
    //     официант есть — он сам разнесёт, поэтому показываем попап уровня плиты;
    //  3) плита свободна и есть ждущий клиент → ручной старт готовки, попап НЕ показываем;
    //  4) плита свободна и готовить некому → попап уровня/апгрейда плиты.
    const s = get()
    if (s.mode !== 'live') return
    playTap()
    const job = s.kitchenJobs.find((j) => j.stoveUid === uid)
    if (job?.kind === 'delivery') {
      // порцию доставки заберёт курьер — игроку брать нечего
      get().pushToast('Заказ доставки — заберёт курьер 🛵', 'info')
      return
    }
    if (job?.ready) {
      if (get().hasStaff('waiter')) {
        set({ stovePopupUid: uid }) // официант сам подаст — тап = попап плиты
      } else {
        // взять готовое блюдо ИМЕННО с этой плиты (плита освобождается сразу)
        set({
          heldDishId: job.id,
          kitchenJobs: s.kitchenJobs.map((j) => (j.id === job.id ? { ...j, stoveUid: '' } : j)),
        })
      }
      return
    }
    if (job) {
      // на этой плите ещё готовится
      get().pushToast('Ещё готовится 🔥', 'info')
      return
    }
    // плита свободна — стартуем готовку именно на ней, если есть ждущий клиент
    // (1 заказ = 1 порция: любой сидящий без своего job, FIFO по времени посадки)
    const waiting = s.clients
      .filter((c) => c.phase === 'seated' && !s.kitchenJobs.some((j) => j.clientId === c.id))
      .sort((a, b) => (a.seatedAt ?? 0) - (b.seatedAt ?? 0))[0]
    if (waiting) {
      get().startCooking(waiting.id, Date.now(), uid)
    } else {
      // некого готовить — открываем попап апгрейда плиты
      set({ stovePopupUid: uid })
    }
  },

  clickTable: (uid) => {
    const s = get()
    if (s.mode !== 'live') return
    playTap()
    if (!s.heldDishId) {
      get().pushToast('Сначала возьмите блюдо 🍽️', 'info')
      return
    }
    const job = s.kitchenJobs.find((j) => j.id === s.heldDishId && j.ready)
    if (!job) {
      // сиротская ссылка на блюдо (job удалён/не готов) — сбрасываем руки
      set({ heldDishId: null })
      get().pushToast('Клиент ушёл 😞', 'error')
      return
    }
    const client = s.clients.find((c) => c.id === job.clientId)
    if (!client) {
      // клиент job'а не найден — удаляем job (плита свободна), сбрасываем руки
      set({
        kitchenJobs: s.kitchenJobs.filter((j) => j.id !== job.id),
        heldDishId: null,
      })
      get().pushToast('Клиент ушёл 😞', 'error')
      return
    }
    if (client.tableUid !== uid) {
      // не сбрасываем heldDishId — блюдо остаётся в руках
      get().pushToast('Не этот стол 🤔', 'info')
      return
    }
    get().serveDish(job.id, Date.now())
  },

  cleanStain: (id) => {
    const s = get()
    if (s.mode !== 'live') return
    const stain = s.stains.find((st) => st.id === id)
    if (!stain || stain.cleaning) return
    set({
      stains: s.stains.map((st) =>
        st.id === id
          ? { ...st, cleaning: { startedAt: Date.now(), durationMs: 1500, by: 'player' as const } }
          : st,
      ),
    })
  },

  // ---------- персонал ----------

  hireStaff: (role, defId) => {
    const s = get()
    const hiredIds = new Set(s.staff.map((m) => m.defId ?? `${m.role}_1`))
    // конкретный слот либо первый ещё не нанятый слот роли
    const def = defId
      ? STAFF_DEFS.find((d) => d.id === defId && d.role === role && !hiredIds.has(d.id))
      : STAFF_DEFS.find((d) => d.role === role && !hiredIds.has(d.id))
    if (!def) return false
    if (def.level > s.level) {
      get().pushToast(`Нужен уровень ${def.level} 🔒`, 'error')
      return false
    }
    if (s.coins < def.cost) {
      get().pushToast(`Не хватает ${def.cost - s.coins}🪙`, 'error')
      return false
    }
    const stats = { ...s.stats }
    if (role === 'cook') stats.cooksHired += 1
    if (role === 'waiter') stats.waitersHired += 1
    if (role === 'cleaner') stats.cleanersHired += 1
    stats.staffHired += 1
    set({
      coins: s.coins - def.cost,
      staff: [...s.staff, { role, hiredAt: Date.now(), defId: def.id }],
      stats,
      ...syncAllQuests({ ...s, stats }),
    })
    get().pushToast(`${def.emoji} ${def.name} нанят! 🎉`, 'success')
    return true
  },

  hasStaff: (role) => get().staff.some((m) => m.role === role),

  staffCount: (role) => get().staff.filter((m) => m.role === role).length,

  // ---------- плиты: уровни и попап ----------

  stoveLevel: (uid) => Math.max(1, Math.min(STOVE_MAX_LEVEL, get().stoveLevels[uid] ?? 1)),

  upgradeStove: (uid) => {
    const s = get()
    if (!s.stoveUids().includes(uid)) return false
    const level = get().stoveLevel(uid)
    if (level >= STOVE_MAX_LEVEL) {
      get().pushToast('Плита максимального уровня ⭐', 'info')
      return false
    }
    const cost = stoveUpgradeCost(level)
    if (s.coins < cost) {
      get().pushToast(`Не хватает ${cost - s.coins}🪙`, 'error')
      return false
    }
    set({
      coins: s.coins - cost,
      stoveLevels: { ...s.stoveLevels, [uid]: level + 1 },
    })
    get().pushToast(`Плита улучшена до уровня ${level + 1}! 🔥`, 'success')
    return true
  },

  selectStove: (uid) => set({ stovePopupUid: uid }),

  // ---------- квесты ----------

  claimQuest: (questId) => {
    const s = get()
    const daily = s.dailyQuests.some((x) => x.id === questId)
    const list = daily ? s.dailyQuests : s.quests
    const q = list.find((x) => x.id === questId)
    if (!q || q.claimed || q.progress < q.target) return
    playQuest()
    playCoins()
    const claimedList = list.map((x) => (x.id === questId ? { ...x, claimed: true } : x))
    set({
      [daily ? 'dailyQuests' : 'quests']: claimedList,
      coins: s.coins + q.reward,
      gems: q.gemReward ? s.gems + q.gemReward : s.gems,
    } as Partial<GameState>)
    const xp = q.xpReward ?? 10
    get().pushToast(
      `Квест выполнен: ${q.title}! +${q.reward}🪙 +${xp}✨${q.gemReward ? ` +${q.gemReward}💎` : ''}`,
      'success',
    )
    get().addXp(xp)
  },

  ensureDailyQuests: () => {
    const s = get()
    const today = mskDateKey()
    if (s.dailyDate === today) return
    // новые сутки по Москве — перевыпускаем 3 случайных задания, прогресс обнуляется
    set({
      dailyQuests: rollDailyQuests(),
      dailyDate: today,
    })
    get().pushToast('Новые ежедневные задания! 📅', 'info')
  },

  // ---------- рынок ----------

  buyIngredient: (id, qty) => {
    const s = get()
    const def = getIngredient(id)
    if (!def || qty < 1) return false
    const cost = def.price * qty
    if (s.coins < cost) {
      get().pushToast(`Не хватает ${cost - s.coins}🪙`, 'error')
      return false
    }
    const stats = { ...s.stats, ingredientsBought: s.stats.ingredientsBought + qty }
    set({
      coins: s.coins - cost,
      inventory: { ...s.inventory, [id]: (s.inventory[id] ?? 0) + qty },
      stats,
      ...syncAllQuests({ ...s, stats }),
    })
    get().pushToast(`+${qty} ${def.emoji} ${def.name} (−${cost}🪙)`, 'success')
    return true
  },

  // ---------- экономика ----------

  addCoins: (n) => set({ coins: Math.max(0, get().coins + n) }),
  addGems: (n) => set({ gems: Math.max(0, get().gems + n) }),

  addXp: (n) => {
    const s = get()
    let { xp, level } = s
    xp += n
    let leveledUp = false
    while (xp >= xpTarget(level)) {
      xp -= xpTarget(level)
      level += 1
      leveledUp = true
    }
    // счётчик для сюжетных квестов «достигни N уровня»
    const stats =
      level > s.stats.levelReached
        ? { ...s.stats, levelReached: level }
        : s.stats
    set({ xp, level, stats, ...syncAllQuests({ ...s, stats }) })
    if (leveledUp) {
      get().addGems(5)
      const unlocks = CATALOG.filter((i) => i.level === level).map((i) => i.name)
      const staffUnlocks = STAFF_DEFS.filter((d) => d.level === level).map((d) => d.name)
      const dishUnlocks = DISHES.filter((d) => d.level === level).map((d) => `${d.emoji} ${d.name}`)
      const parts = [...unlocks, ...staffUnlocks, ...dishUnlocks]
      get().pushToast(
        `Уровень ${level}! +5💎${parts.length ? ` — открыто: ${parts.join(', ')}` : ''}`,
        'success',
      )
    }
  },

  // ---------- производные ----------

  atmosphere: () => {
    const s = get()
    let sum = 0
    for (const p of s.items) {
      const def = getItem(p.itemId)
      if (def?.atmosphere) sum += def.atmosphere
    }
    // лужи на полу снижают атмосферу: −2% за каждую
    const puddles = s.stains.filter((st) => st.kind === 'floor').length
    return Math.max(0, Math.min(50, sum) - 2 * puddles)
  },

  totalSeats: () => {
    const s = get()
    return s.items.reduce((acc, p) => acc + (getItem(p.itemId)?.seats ?? 0), 0)
  },

  stoveUids: () =>
    get()
      .items.filter((p) => getItem(p.itemId)?.isStove)
      .map((p) => p.uid),

  maxConcurrentOrders: () => {
    // одна плита = одна порция одновременно (холодильник больше лимит не даёт — он декор)
    return Math.max(1, get().stoveUids().length)
  },

  // ---------- фидбек ----------

  spawnFloat: (x, y, text, kind = 'coin') => {
    const f = { id: nextUid('float'), x, y, text, kind }
    set({ floats: [...get().floats, f] })
    setTimeout(() => {
      set({ floats: get().floats.filter((v) => v.id !== f.id) })
    }, 950)
  },

  pushToast: (text, kind = 'info') => {
    const t = { id: nextUid('toast'), text, kind }
    set({ toasts: [...get().toasts.slice(-2), t] })
    setTimeout(() => get().dismissToast(t.id), 3500)
  },

  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),

  toggleSound: () => set({ soundOn: !get().soundOn }),
  toggleSpeed: () => set({ speed: get().speed === 1 ? 2 : 1 }),
  markSaved: () => set({ savedAt: Date.now() }),

  resetGame: () => {
    localStorage.removeItem(SAVE_KEY)
    resetSimulation() // чистим модульные Map симуляции (spawnAccum/eatUntil)
    set({
      ...baseState(),
      items: initialItems(),
      quests: initialQuests(),
      dailyQuests: rollDailyQuests(),
      dailyDate: mskDateKey(),
    })
    get().pushToast('Новый ресторан, новая жизнь! 🏠', 'info')
  },

  completeOnboarding: () => set({ onboardingDone: true }),
  completeTutorial: () => set({ tutorialDone: true }),

  // ---------- симуляция (реализация в simulation.ts подключается ниже) ----------
  simTick: () => {},
  spawnClient: () => {},
  startCooking: () => {},
  serveDish: () => {},
  startDeliveryCooking: () => {},
}))

// Переопределяем симуляционные экшены (отдельный модуль, чтобы store.ts оставался контрактом)
import {
  installSimulation,
  resetSimulation,
  pauseRealtimeTimers,
  resumeRealtimeTimers,
} from './simulation'
import { initSound, playCoins, playQuest, playTap } from './sound'
installSimulation(useGameStore)
initSound() // звуковые подписки (готовка/готовность/подача/ошибки) — без правок simulation.ts
// при загрузке: если по Москве новые сутки — перевыпустить ежедневные квесты
useGameStore.getState().ensureDailyQuests()

export { SAVE_KEY, initialQuests, initialStats, syncAllQuests }
export type { Client, KitchenJob }
