import { create } from 'zustand'
import type {
  Client,
  GameState,
  GameStats,
  KitchenJob,
  PlacedItem,
  Quest,
  StaffRole,
  ToastMsg,
} from './types'
import {
  CATALOG,
  STAFF_DEFS,
  getItem,
  sellPrice,
  xpTarget,
  HALL_W,
  HALL_H,
  KITCHEN_W,
} from './catalog'

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
  return [
    {
      id: 'first_guest',
      title: 'Первый гость',
      description: 'Обслужи 1 клиента',
      target: 1,
      progress: 0,
      reward: 100,
      claimed: false,
    },
    {
      id: 'second_table',
      title: 'Второй стол',
      description: 'Купи стол',
      target: 1,
      progress: 0,
      reward: 150,
      claimed: false,
    },
    {
      id: 'happy_faces',
      title: 'Довольные лица',
      description: 'Получи 5 хороших отзывов',
      target: 5,
      progress: 0,
      reward: 200,
      claimed: false,
    },
    {
      id: 'team',
      title: 'Команда',
      description: 'Найми повара',
      target: 1,
      progress: 0,
      reward: 250,
      claimed: false,
    },
    {
      id: 'cozy',
      title: 'Уютнее некуда',
      description: 'Размести 3 предмета декора',
      target: 3,
      progress: 0,
      reward: 300,
      claimed: false,
    },
  ]
}

function initialStats(): GameStats {
  return {
    servedClients: 0,
    goodReviews: 0,
    tablesBought: 0,
    decorPlaced: 0,
    cooksHired: 0,
  }
}

const QUEST_STAT: Record<string, keyof GameStats> = {
  first_guest: 'servedClients',
  second_table: 'tablesBought',
  happy_faces: 'goodReviews',
  team: 'cooksHired',
  cozy: 'decorPlaced',
}

function syncQuests(quests: Quest[], stats: GameStats): Quest[] {
  return quests.map((q) =>
    q.claimed
      ? q
      : { ...q, progress: Math.min(q.target, stats[QUEST_STAT[q.id]] ?? 0) },
  )
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
  staff: { role: StaffRole; hiredAt: number }[]
  quests: Quest[]
  stats: GameStats
  soundOn: boolean
  onboardingDone: boolean
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
    stats: s.stats,
    soundOn: s.soundOn,
    onboardingDone: s.onboardingDone,
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
    return {
      coins: d.coins,
      gems: d.gems,
      xp: d.xp,
      level: d.level,
      reputation: d.reputation ?? 0,
      items: d.items,
      staff: d.staff,
      quests: syncQuests(d.quests ?? initialQuests(), d.stats ?? initialStats()),
      stats: d.stats ?? initialStats(),
      soundOn: d.soundOn ?? true,
      onboardingDone: d.onboardingDone ?? false,
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
  // --- персонал ---
  hireStaff: (role: StaffRole) => boolean
  hasStaff: (role: StaffRole) => boolean
  // --- квесты ---
  claimQuest: (questId: string) => void
  // --- экономика / прогресс ---
  addCoins: (n: number) => void
  addGems: (n: number) => void
  addXp: (n: number) => void
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
  // --- симуляция (вызывается из simulation.ts) ---
  simTick: (dtSec: number, now: number) => void
  spawnClient: (now: number) => void
  startCooking: (clientId: string, now: number) => void
  serveDish: (jobId: string, now: number) => void
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
    kitchenJobs: [],
    quests: initialQuests(),
    stats: initialStats(),
    floats: [],
    toasts: [],
    mode: 'live',
    buildItemId: null,
    movingUid: null,
    heldDishId: null,
    soundOn: true,
    speed: 1,
    savedAt: 0,
    onboardingDone: false,
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
    set({ mode: 'build', buildItemId: itemId ?? null, movingUid: null, heldDishId: null })
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

    let items: PlacedItem[]
    if (s.movingUid) {
      items = s.items.map((i) => (i.uid === s.movingUid ? { ...i, x, y } : i))
      set({ items, movingUid: null })
    } else {
      items = [...s.items, { uid: nextUid('item'), itemId, x, y }]
      const def = getItem(itemId)!
      const stats = { ...s.stats }
      if (def.category === 'table') stats.tablesBought += 1
      if (def.category === 'decor') stats.decorPlaced += 1
      set({
        items,
        stats,
        quests: syncQuests(s.quests, stats),
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
    set({
      items: s.items.filter((i) => i.uid !== uid),
      coins: s.coins + sellPrice(def.price),
      movingUid: s.movingUid === uid ? null : s.movingUid,
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
    const s = get()
    if (s.mode !== 'live') return
    const job = s.kitchenJobs.find((j) => j.stoveUid === uid)
    if (job?.ready) {
      // взять готовое блюдо
      set({ heldDishId: job.id })
      return
    }
    // нет активной готовки на этой плите — стартуем, если есть ждущий клиент
    if (!job) {
      const waiting = s.clients.find((c) => c.phase === 'seated' && !s.kitchenJobs.some((j) => j.clientId === c.id))
      if (waiting && s.kitchenJobs.filter((j) => !j.ready).length < get().maxConcurrentOrders()) {
        get().startCooking(waiting.id, Date.now())
      }
    }
  },

  clickTable: (uid) => {
    const s = get()
    if (s.mode !== 'live') return
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

  // ---------- персонал ----------

  hireStaff: (role) => {
    const s = get()
    const def = STAFF_DEFS.find((d) => d.role === role)
    if (!def || s.staff.some((m) => m.role === role)) return false
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
    set({
      coins: s.coins - def.cost,
      staff: [...s.staff, { role, hiredAt: Date.now() }],
      stats,
      quests: syncQuests(s.quests, stats),
    })
    get().pushToast(`${def.emoji} ${def.name} нанят! 🎉`, 'success')
    return true
  },

  hasStaff: (role) => get().staff.some((m) => m.role === role),

  // ---------- квесты ----------

  claimQuest: (questId) => {
    const s = get()
    const q = s.quests.find((x) => x.id === questId)
    if (!q || q.claimed || q.progress < q.target) return
    set({
      quests: s.quests.map((x) => (x.id === questId ? { ...x, claimed: true } : x)),
      coins: s.coins + q.reward,
    })
    get().pushToast(`Квест выполнен: ${q.title}! +${q.reward}🪙`, 'success')
    get().addXp(10)
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
    set({ xp, level })
    if (leveledUp) {
      get().addGems(5)
      const unlocks = CATALOG.filter((i) => i.level === level).map((i) => i.name)
      const staffUnlocks = STAFF_DEFS.filter((d) => d.level === level).map((d) => d.name)
      const parts = [...unlocks, ...staffUnlocks]
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
    return Math.min(50, sum)
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
    const s = get()
    let extra = 0
    for (const p of s.items) {
      const def = getItem(p.itemId)
      if (def?.extraOrders) extra += def.extraOrders
    }
    return 1 + extra
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
    resetSimulation() // чистим модульные Map симуляции (spawnAccum/eatUntil/lastMove)
    set({ ...baseState(), items: initialItems(), quests: initialQuests() })
    get().pushToast('Новый ресторан, новая жизнь! 🏠', 'info')
  },

  completeOnboarding: () => set({ onboardingDone: true }),

  // ---------- симуляция (реализация в simulation.ts подключается ниже) ----------
  simTick: () => {},
  spawnClient: () => {},
  startCooking: () => {},
  serveDish: () => {},
}))

// Переопределяем симуляционные экшены (отдельный модуль, чтобы store.ts оставался контрактом)
import {
  installSimulation,
  resetSimulation,
  pauseRealtimeTimers,
  resumeRealtimeTimers,
} from './simulation'
installSimulation(useGameStore)

export { SAVE_KEY, initialQuests, initialStats }
export type { Client, KitchenJob }
