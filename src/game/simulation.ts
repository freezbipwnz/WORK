// Тик-симуляция RestoCity: спавн клиентов → посадка → заказ → готовка → подача → оплата.
// Вызывается из GameScreen через setInterval (250ms). В build mode игра на паузе —
// tick не вызывается, терпение не тикает.

import type { Client, KitchenJob, PathCell, Pedestrian, StaffNpc, Stain } from './types'
import {
  adjacentWalkableKeys,
  doorPathToItem,
  findNearestWalkable,
  findPath,
  isWalkable,
  pathToDoor,
  pathToItemAdjacent,
} from './pathfinding'
import {
  CLIENT_COLORS,
  CLIENT_FACES,
  DOOR,
  HALL_H,
  HALL_W,
  PARTY_CHECK_FACTOR,
  checkAmount,
  clientsPerMinute,
  cookDuration,
  facadeBonusPct,
  getItem,
  maxConcurrentClients,
  partyChance,
  repPerClient,
  tipAmount,
  vipChance,
  xpPerClient,
  PED_LANE_X,
  PED_LEFT_Y_MIN,
  PED_LEFT_Y_MAX,
  PED_DOOR_ROW,
} from './catalog'
import { nextUid, syncAllQuests, type useGameStore } from './store'
import { getDishByEmoji, hasIngredients, pickOrderEmoji } from './market'
import {
  DELIVERY_MIN_LEVEL,
  DELIVERY_REP_PENALTY,
  DELIVERY_RETRY_MS,
  MAX_ACTIVE_DELIVERIES,
  rollDeliveryOrder,
  rollNextDelivery,
} from './delivery'

type Store = typeof useGameStore

/**
 * ЕДИНАЯ скорость ходьбы ВСЕХ фигур (клиенты, повар/официант, уборщик,
 * пешеходы): ~2.2 клетки/сек при ×1 (эталон — прежняя скорость официанта).
 * Никаких множителей по типам NPC: все используют эту константу напрямую.
 */
export const WALK_CELLS_PER_SEC = 2.2
const EAT_SEC = 15 // трапеза длится ровно 15 секунд
const PATIENCE_SEC = 60 // терпение клиента ×2 (было 30)
const PERFECT_SERVICE_SEC = 15

let spawnAccum = 0
// троттлинг тоста «не хватает ингредиентов» (автоповар дёргает startCooking каждый тик)
let lastIngToastAt = 0
// тост «Появилась грязь!» — один раз за сессию
let dirtToastShown = false

// --- VIP ---
const VIP_PATIENCE_SEC = PATIENCE_SEC * 1.5 // VIP: ×1.5 от базы (90с)
const VIP_WAIT_DOOR_MS = 20_000 // VIP ждёт престижный стол у двери до 20с
const VIP_REP_SERVE = 10 // +10⭐ за обслуженного VIP
const VIP_REP_LOSS = 5 // −5⭐, если VIP ушёл, не дождавшись стола
const VIP_GEM_CHANCE = 0.2 // шанс +1💎 при идеальном обслуживании VIP

// --- Час пик (rush hour) ---
const RUSH_DURATION_MS = 60_000 // 60 сек
const RUSH_MIN_GAP_MS = 4 * 60_000 // следующий пик через 4–6 мин
const RUSH_MAX_GAP_MS = 6 * 60_000
const RUSH_SPAWN_MULT = 2 // частота спавна ×2
const RUSH_TIP_BONUS = 10 // +10% атмосферы к чаевым (клэмп 50)
let nextRushAt = 0 // момент следующего пика (ms), 0 = не назначен

function rollNextRush(now: number): number {
  return now + RUSH_MIN_GAP_MS + Math.random() * (RUSH_MAX_GAP_MS - RUSH_MIN_GAP_MS)
}

const STAIN_CHANCE = 0.35
const CLEAN_CLEANER_MS = 6000 // уборщик: ~6с на пятно (тап игрока 1.5с — задаётся в store.cleanStain)

/** Лимит активных пятен: 3 + уровень/5 (макс 8) */
export function stainLimit(level: number): number {
  return Math.min(8, 3 + Math.floor(level / 5))
}

// ссылка на стор для модульных функций паузы/сдвига таймеров
let storeRef: Store | null = null

// --- Прохожие на тротуаре (чистая анимация, на спавн клиентов не влияет) ---
const PED_MIN = 2
const PED_MAX = 4
const PED_PEEK_CHANCE = 0.15 // базовый шанс «заглянуть»
const PED_PEEK_REP_BONUS = 0.002 // +0.2% за каждую ⭐ репутации (кап +25%)
const PED_PEEK_FADE_MS = 1400
let pedTarget = 0 // сколько пешеходов держим на улице (2..4), 0 = ещё не бросали
let pedSpawnCooldown = 0

/** Полный сброс модульного состояния симуляции (вызывается из resetGame) */
export function resetSimulation() {
  spawnAccum = 0
  nextRushAt = 0
  lastIngToastAt = 0
  pedTarget = 0
  pedSpawnCooldown = 0
}

/** Сдвиг всех таймеров реального времени (startedAt/readyAt/seatedAt/eatUntil) на ms —
 *  чтобы пауза (build mode, скрытая вкладка) не дозревала готовку/терпение */
function shiftRealtimeTimers(ms: number) {
  if (ms <= 0) return
  if (nextRushAt) nextRushAt += ms
  const s = storeRef?.getState()
  if (!s) return
  storeRef!.setState({
    kitchenJobs: s.kitchenJobs.map((j) => ({
      ...j,
      startedAt: j.startedAt + ms,
      readyAt: j.readyAt !== undefined ? j.readyAt + ms : undefined,
    })),
    clients: s.clients.map((c) => ({
      ...c,
      seatedAt: c.seatedAt !== undefined ? c.seatedAt + ms : undefined,
      waitingUntil: c.waitingUntil !== undefined ? c.waitingUntil + ms : undefined,
      eatStart: c.eatStart !== undefined ? c.eatStart + ms : undefined,
      eatEnd: c.eatEnd !== undefined ? c.eatEnd + ms : undefined,
    })),
    rushEndsAt: s.rushActive ? s.rushEndsAt + ms : s.rushEndsAt,
    // доставки: дедлайны и расписание тоже «спят» на паузе
    deliveries: s.deliveries.map((d) => ({ ...d, expiresAt: d.expiresAt + ms })),
    nextDeliveryAt: s.nextDeliveryAt ? s.nextDeliveryAt + ms : s.nextDeliveryAt,
    pedestrians: s.pedestrians.map((p) =>
      p.fadeAt !== undefined ? { ...p, fadeAt: p.fadeAt + ms } : p,
    ),
  })
}

let pausedAt: number | null = null

/** Пауза симуляции (build mode / скрытая вкладка): запоминаем момент */
export function pauseRealtimeTimers() {
  if (pausedAt === null) pausedAt = Date.now()
}

/** Снятие паузы: сдвигаем таймеры реального времени на длительность сна */
export function resumeRealtimeTimers() {
  if (pausedAt === null) return
  const slept = Date.now() - pausedAt
  pausedAt = null
  shiftRealtimeTimers(slept)
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

/**
 * После ухода клиента с шансом ~35% остаётся грязь: пятно на его столе
 * (стол не принимает новых клиентов) или лужа на соседней клетке пола
 * (−2% атмосферы). Уважает лимит активных пятен.
 */
function maybeSpawnStain(tableUid: string | undefined, now: number) {
  const s = storeRef!.getState()
  if (!tableUid) return
  if (s.stains.length >= stainLimit(s.level)) return
  if (Math.random() >= STAIN_CHANCE) return
  const table = s.items.find((i) => i.uid === tableUid)
  if (!table) return
  const kind: Stain['kind'] = Math.random() < 0.5 ? 'table' : 'floor'
  if (kind === 'table' && s.stains.some((st) => st.tableUid === tableUid)) return // не плодим пятна на одном столе
  let x = table.x
  let y = table.y
  if (kind === 'floor') {
    const cells: [number, number][] = [
      [table.x - 1, table.y],
      [table.x, table.y + 1],
      [table.x + 1, table.y],
      [table.x, table.y - 1],
    ].filter(([cx, cy]) => cx >= 0 && cy >= 0 && cx < HALL_W && cy < HALL_H && isWalkable(s.items, cx, cy)) as [number, number][]
    if (!cells.length) return
    ;[x, y] = pick(cells)
  }
  const stain: Stain = {
    id: nextUid('stain'),
    x,
    y,
    kind,
    tableUid: kind === 'table' ? tableUid : undefined,
    createdAt: now,
  }
  storeRef!.setState({ stains: [...s.stains, stain] })
  if (!dirtToastShown) {
    dirtToastShown = true
    s.pushToast('Появилась грязь! Уберите тапом 🧽', 'info')
  }
}

/**
 * «Престижный» стол для VIP: footprint стола в радиусе 2 клеток (Чебышёв)
 * от любого decor-предмета зала.
 */
export function isNearDecor(items: { itemId: string; x: number; y: number }[], table: { itemId: string; x: number; y: number }): boolean {
  const tDef = getItem(table.itemId)
  if (!tDef) return false
  for (const d of items) {
    const dDef = getItem(d.itemId)
    if (dDef?.category !== 'decor') continue
    const distX = Math.max(0, Math.max(d.x - (table.x + tDef.w - 1), table.x - (d.x + dDef.w - 1)))
    const distY = Math.max(0, Math.max(d.y - (table.y + tDef.h - 1), table.y - (d.y + dDef.h - 1)))
    if (Math.max(distX, distY) <= 2) return true
  }
  return false
}

/** Свободные (не занятые и без пятен) столы; для VIP — только престижные */
function freeTablesFor(s: ReturnType<Store['getState']>, vip: boolean, excludeClientId?: string) {
  const busy = new Set(
    s.clients.filter((c) => c.id !== excludeClientId).map((c) => c.tableUid).filter(Boolean),
  )
  const stained = new Set(s.stains.filter((st) => st.kind === 'table').map((st) => st.tableUid))
  return s.items.filter(
    (p) =>
      getItem(p.itemId)?.seats &&
      !busy.has(p.uid) &&
      !stained.has(p.uid) &&
      (!vip || isNearDecor(s.items, p)),
  )
}

/** Попытка посадить VIP за престижный стол; null — свободного престижного стола нет */
function seatVip(s: ReturnType<Store['getState']>, c: Client): Client | null {
  for (const t of freeTablesFor(s, true, c.id)) {
    const path = doorPathToItem(s.items, t)
    if (path && path.length) {
      const [first, ...rest] = path
      return {
        ...c,
        x: DOOR.x,
        y: DOOR.y,
        tx: first.x,
        ty: first.y,
        phase: 'arriving',
        tableUid: t.uid,
        path: rest,
        waitingUntil: undefined,
      }
    }
  }
  return null
}

/**
 * Плавное движение к цели (упрощённый обход: сначала X, потом Y) с линейной
 * интерполяцией по игровому времени — без строб-шагов по клеткам.
 * Возвращает null, если цель достигнута.
 */
function moveToward(
  c: { x: number; y: number; tx: number; ty: number; facing?: number },
  dtSec: number,
): { x: number; y: number; facing: number } | null {
  const maxDelta = WALK_CELLS_PER_SEC * dtSec
  let { x, y, facing = 1 } = c
  const move = (pos: number, target: number): number => {
    const d = target - pos
    if (Math.abs(d) <= maxDelta) return target
    return pos + Math.sign(d) * maxDelta
  }
  if (Math.abs(c.tx - x) > 1e-9) {
    const nx = move(x, c.tx)
    if (nx !== x) facing = Math.sign(nx - x) // экранное направление: +x → вправо
    x = nx
  } else if (Math.abs(c.ty - y) > 1e-9) {
    const ny = move(y, c.ty)
    if (ny !== y) facing = -Math.sign(ny - y) // экранное направление: +y → влево
    y = ny
  }
  if (x === c.tx && y === c.ty) return null
  return { x, y, facing }
}

/**
 * Продвижение по пути: если текущая цель (tx,ty) достигнута и есть waypoints —
 * берём следующий. Возвращает {tx, ty, path} (path может стать пустым).
 */
function advanceWaypoint<T extends { tx: number; ty: number; path?: PathCell[] }>(
  e: T,
  x: number,
  y: number,
): { tx: number; ty: number; path: PathCell[] } {
  const path = e.path ?? []
  if (x === e.tx && y === e.ty && path.length > 0) {
    const [next, ...rest] = path
    return { tx: next.x, ty: next.y, path: rest }
  }
  return { tx: e.tx, ty: e.ty, path }
}

/** Перевод клиента в фазу ухода по найденному пути (или напрямую, если пути нет) */
function leaveWithPath(c: Client, path: PathCell[] | null, phase: 'leaving' | 'angry-leaving'): Client {
  if (path && path.length) {
    const [first, ...rest] = path
    return { ...c, phase, tx: first.x, ty: first.y, path: rest }
  }
  return { ...c, phase, tx: DOOR.x, ty: DOOR.y, path: [] }
}

// ---------- NPC персонала: повар и официант ----------

/**
 * ПРАВИЛО «1 повар = 1 плита»: i-й повар владеет i-й плитой по порядку stoveUids.
 * Рабочая клетка — соседняя walkable клетка ЕГО плиты, не занятая другими
 * поварами (takenCells — резервации клеток в этом тике; клетка резервируется
 * за поваром сразу при выборе). null — плиты/свободной клетки у неё нет.
 */
function cookWorkCell(
  s: ReturnType<Store['getState']>,
  cookIndex: number,
  takenCells: Set<string>,
): PathCell | null {
  const uid = s.stoveUids()[cookIndex]
  if (!uid) return null
  const stove = s.items.find((i) => i.uid === uid)
  if (!stove) return null
  const adj = [...adjacentWalkableKeys(s.items, stove)].sort()
  for (const key of adj) {
    if (takenCells.has(key)) continue
    takenCells.add(key)
    const [x, y] = key.split(',').map(Number)
    return { x, y }
  }
  return null
}

/** Запасная клетка на кухне для повара без своей плиты (поваров больше, чем плит):
 *  ждёт в стороне, к чужим плитам НЕ идёт. */
function cookStandbyCell(
  s: ReturnType<Store['getState']>,
  cookIndex: number,
  takenCells: Set<string>,
): PathCell {
  const base = findNearestWalkable(s.items, 11, 5, 6) ?? { x: 11, y: 5 }
  const k = cookIndex + 1
  const candidates: PathCell[] = [
    { x: base.x, y: base.y },
    { x: base.x + k, y: base.y },
    { x: base.x, y: base.y + k },
    { x: base.x - k, y: base.y },
    { x: base.x, y: base.y - k },
    { x: base.x + k, y: base.y + k },
    { x: base.x - k, y: base.y - k },
  ]
  for (const c of candidates) {
    const key = `${c.x},${c.y}`
    if (takenCells.has(key)) continue
    if (!isWalkable(s.items, c.x, c.y)) continue
    takenCells.add(key)
    return c
  }
  return base
}

/** Шаг NPC по пути к текущей цели; true = ещё идёт, false = пришёл */
function npcStep(npc: StaffNpc, dtSec: number): StaffNpc {
  const adv = advanceWaypoint(npc, npc.x, npc.y)
  let next: StaffNpc = { ...npc, ...adv }
  const moved = moveToward(next, dtSec)
  if (moved) next = { ...next, ...moved }
  else next = { ...next, x: next.tx, y: next.ty } // дошёл за этот тик — зафиксировать цель
  return next
}

const npcAtTarget = (n: StaffNpc) => n.x === n.tx && n.y === n.ty && n.path.length === 0

/**
 * Синхронизация массивов NPC с нанятым персоналом: на каждый нанятый слот
 * cook/waiter — свой StaffNpc со своей фазой. Появляются у домашних точек,
 * лишние (сброс/миграция) исчезают. Вызывается каждый тик.
 */
function ensureStaffNpcs(s: ReturnType<Store['getState']>) {
  const cooksWanted = s.staffCount('cook')
  const waitersWanted = s.staffCount('waiter')
  let cooks = s.cooks
  let waiters = s.waiters
  if (cooks.length !== cooksWanted) {
    // каждый повар появляется на СВОЕЙ клетке (у своей плиты / на кухне в стороне)
    const taken = new Set<string>(
      cooks.map((c) => `${Math.round(c.x)},${Math.round(c.y)}`),
    )
    cooks = Array.from({ length: cooksWanted }, (_, i) => {
      if (cooks[i]) return cooks[i]
      const spot = cookWorkCell(s, i, taken) ?? cookStandbyCell(s, i, taken)
      return { x: spot.x, y: spot.y, tx: spot.x, ty: spot.y, path: [], phase: 'idle' as const, facing: 1 }
    })
  }
  if (waiters.length !== waitersWanted) {
    const hx = Math.floor(HALL_W / 2)
    const hy = HALL_H - 1
    waiters = Array.from(
      { length: waitersWanted },
      (_, i) => waiters[i] ?? { x: hx, y: hy, tx: hx, ty: hy, path: [], phase: 'idle' as const, facing: 1 },
    )
  }
  if (cooks !== s.cooks || waiters !== s.waiters) storeRef!.setState({ cooks, waiters })
}

/**
 * Повар: строгое владение — i-й повар обслуживает ТОЛЬКО i-ю плиту
 * (по порядку stoveUids). К чужим плитам не идёт никогда; лишние повара
 * (поваров больше, чем плит) ждут на кухне в стороне. Рабочая клетка у плиты
 * у каждого повара своя (резервация через takenCells на тик).
 */
function tickCook(
  s: ReturnType<Store['getState']>,
  dtSec: number,
  cook: StaffNpc,
  cookIndex: number,
  takenCells: Set<string>,
): StaffNpc {
  const myUid = s.stoveUids()[cookIndex]
  // своя текущая клетка не считается чужой резервацией
  takenCells.delete(`${Math.round(cook.x)},${Math.round(cook.y)}`)
  let c: StaffNpc = { ...cook, stoveUid: myUid }
  const job = myUid ? s.kitchenJobs.find((j) => j.stoveUid === myUid) : undefined
  const cooking = !!job && !job.ready

  // целевая клетка: у своей плиты, либо запасная на кухне
  const cell = myUid
    ? cookWorkCell(s, cookIndex, takenCells)
    : cookStandbyCell(s, cookIndex, takenCells)
  if (!cell) {
    // все клетки своей плиты заняты — ждём на месте, к чужим не идём
    return { ...c, path: [], phase: cooking ? 'working' : 'idle' }
  }

  // уже на своей клетке — стоим / работаем
  if (Math.round(c.x) === cell.x && Math.round(c.y) === cell.y && npcAtTarget(c)) {
    return { ...c, x: cell.x, y: cell.y, tx: cell.x, ty: cell.y, path: [], phase: cooking ? 'working' : 'idle' }
  }

  // цель сменилась — прокладываем путь к своей клетке
  const dest = c.path.length ? c.path[c.path.length - 1] : { x: c.tx, y: c.ty }
  if (dest.x !== cell.x || dest.y !== cell.y) {
    const p = findPath(s.items, Math.round(c.x), Math.round(c.y), cell.x, cell.y)
    if (p && p.length) {
      const [first, ...rest] = p
      c = { ...c, tx: first.x, ty: first.y, path: rest }
    } else if (Math.round(c.x) === cell.x && Math.round(c.y) === cell.y) {
      c = { ...c, tx: cell.x, ty: cell.y, path: [] }
    } else {
      // пути нет — ждём на месте (проход появится / клетка освободится)
      return { ...c, path: [], phase: cooking ? 'working' : 'idle' }
    }
  }

  c = npcStep(c, dtSec)
  if (npcAtTarget(c)) return { ...c, phase: cooking ? 'working' : 'idle' }
  return { ...c, phase: 'to-stove' }
}

/** Официант: плита с готовым блюдом → стол клиента → подача по приходу.
 *  claimedJobs — job'ы, уже взятые другими официантами в этом тике. */
function tickWaiter(
  s: ReturnType<Store['getState']>,
  dtSec: number,
  now: number,
  waiter: StaffNpc,
  claimedJobs: Set<string>,
): StaffNpc {
  let w = waiter

  if (w.phase === 'to-table') {
    const job = s.kitchenJobs.find((j) => j.id === w.jobId)
    const client = job && s.clients.find((c) => c.id === job.clientId)
    if (!job || !client) {
      w = { ...w, phase: 'idle', jobId: undefined } // клиент ушёл — блюдо снимаем
    } else {
      w = npcStep(w, dtSec)
      if (npcAtTarget(w)) {
        s.serveDish(job.id, now) // подача по приходу к столу
        w = { ...w, phase: 'idle', jobId: undefined }
      }
      return w
    }
  }

  if (w.phase === 'to-stove') {
    const job = s.kitchenJobs.find((j) => j.id === w.jobId && j.ready)
    if (!job) {
      w = { ...w, phase: 'idle', jobId: undefined }
    } else {
      w = npcStep(w, dtSec)
      if (npcAtTarget(w)) {
        // взял блюдо — плита освобождается СРАЗУ (повар в этом же тике возьмёт следующий заказ)
        const freedJobId = job.id
        storeRef!.setState({
          kitchenJobs: storeRef!.getState().kitchenJobs.map((j) =>
            j.id === freedJobId ? { ...j, stoveUid: '' } : j,
          ),
        })
        // идём к столу клиента
        const client = s.clients.find((c) => c.id === job.clientId)
        const table = client?.tableUid ? s.items.find((i) => i.uid === client.tableUid) : undefined
        const path = table ? pathToItemAdjacent(s.items, w.x, w.y, table) : null
        if (client && table && path && path.length) {
          const [first, ...rest] = path
          return { ...w, tx: first.x, ty: first.y, path: rest, phase: 'to-table' }
        }
        // до стола не дойти — ждём у плиты, попробуем на следующем тике
        return w
      }
      return w
    }
  }

  // idle: берём первый готовый заказ (один заказ за раз).
  // СТРОГИЕ РЕЗЕРВАЦИИ «1 блюдо = 1 официант»:
  //  - claimedJobs: job уже взят коллегой В ЭТОМ тике (claim атомарен: все
  //    официанты тикают до единого setState — гонки нет);
  //  - takenJobs: job закреплён за коллегой с ПРОШЛЫХ тиков (его jobId в стейте);
  //  - takenClients: клиент уже обслуживается коллегой — второй официант к нему
  //    не идёт (1 клиент = 1 job, но страхуемся и по clientId).
  // Резервация живёт, пока официант в to-stove/to-table с этим jobId; уход в
  // idle (клиент ушёл / job снят / дошёл и подал) снимает её — вечных блокировок нет.
  const takenJobs = new Set(
    s.waiters.filter((o) => o !== waiter && o.jobId).map((o) => o.jobId as string),
  )
  const takenClients = new Set(
    s.waiters
      .filter((o) => o !== waiter && o.jobId)
      .map((o) => s.kitchenJobs.find((j) => j.id === o.jobId)?.clientId)
      .filter(Boolean) as string[],
  )
  // delivery-jobs официант НЕ трогает — их забирает курьер
  const ready = s.kitchenJobs.find(
    (j) =>
      j.ready &&
      j.kind !== 'delivery' &&
      j.stoveUid &&
      !claimedJobs.has(j.id) &&
      !takenJobs.has(j.id) &&
      !takenClients.has(j.clientId),
  )
  if (ready) {
    claimedJobs.add(ready.id)
    const stove = s.items.find((i) => i.uid === ready.stoveUid)
    if (stove) {
      const path = pathToItemAdjacent(s.items, w.x, w.y, stove)
      if (path && path.length) {
        const [first, ...rest] = path
        return { ...w, tx: first.x, ty: first.y, path: rest, phase: 'to-stove', jobId: ready.id }
      }
      // до плиты не дойти (не должно случаться при валидации) — подача как раньше
      s.serveDish(ready.id, now)
    }
  }
  return w
}

/**
 * Пешеходы на тротуаре: 2–4 NPC идут вдоль улицы мимо двери. С шансом ~15%
 * (растёт с репутацией) «заглядывают» — поворачивают к двери и тают.
 * Чистая анимация: на спавн реальных клиентов не влияет (баланс не тронут).
 */
function tickPedestrians(dtSec: number, now: number) {
  const s = storeRef!.getState()
  if (!pedTarget) pedTarget = PED_MIN + Math.floor(Math.random() * (PED_MAX - PED_MIN + 1))

  let changed = false
  // та же единая скорость, что у клиентов/персонала (без множителей)
  const step = WALK_CELLS_PER_SEC * dtSec
  const peekChance =
    PED_PEEK_CHANCE + Math.min(0.25, s.reputation * PED_PEEK_REP_BONUS)

  let peds = s.pedestrians
  const next: Pedestrian[] = []
  for (const p of peds) {
    if (p.state === 'peek') {
      // идём к двери и исчезаем по таймеру
      if (now >= (p.fadeAt ?? 0)) {
        changed = true
        continue
      }
      // движение к точке у двери (x, затем y — как у клиентов)
      const maxDelta = step
      let { x, y, facing } = p
      if (Math.abs(p.tx - x) > 1e-9) {
        const d = p.tx - x
        const nx = Math.abs(d) <= maxDelta ? p.tx : x + Math.sign(d) * maxDelta
        if (nx !== x) facing = Math.sign(nx - x)
        x = nx
      } else if (Math.abs(p.ty - y) > 1e-9) {
        const d = p.ty - y
        const ny = Math.abs(d) <= maxDelta ? p.ty : y + Math.sign(d) * maxDelta
        if (ny !== y) facing = -Math.sign(ny - y)
        y = ny
      }
      next.push({ ...p, x, y, facing })
      changed = true
      continue
    }
    // walk: движение вдоль левой улицы (линия x = PED_LANE_X, y растёт) к краю сцены
    const d = p.ty - p.y
    const ny = Math.abs(d) <= step ? p.ty : p.y + Math.sign(d) * step
    // на экране +y — вниз-влево → смотрим влево (facing -1)
    let next2: Pedestrian = { ...p, y: ny, facing: ny !== p.y ? -Math.sign(ny - p.y) : p.facing }
    changed = true
    if (ny === p.ty) continue // дошёл до края — уходит со сцены
    // «заглядывает»? бросаем один раз при проходе ряда двери (y≈PED_DOOR_ROW)
    if (!next2.peekRolled && Math.abs(ny - PED_DOOR_ROW) < 0.45) {
      next2 = { ...next2, peekRolled: true }
      if (Math.random() < peekChance) {
        next2 = {
          ...next2,
          state: 'peek',
          tx: -1.1,
          ty: PED_DOOR_ROW + 0.6, // точка у двери (DOOR = (-1,4)) — за стеной, тает
          fadeAt: now + PED_PEEK_FADE_MS,
        }
      }
    }
    next.push(next2)
  }

  // доспавн до целевого числа (2–4) с небольшой паузой
  if (next.length < pedTarget) {
    pedSpawnCooldown -= dtSec
    if (pedSpawnCooldown <= 0) {
      pedSpawnCooldown = 1.5 + Math.random() * 3
      // спавн ЗА верхним краем сцены, деспавн за левым краем (линия x = PED_LANE_X)
      next.push({
        id: nextUid('ped'),
        x: PED_LANE_X,
        y: PED_LEFT_Y_MIN,
        tx: PED_LANE_X,
        ty: PED_LEFT_Y_MAX,
        state: 'walk',
        sprite: `customer_${1 + Math.floor(Math.random() * 3)}`,
        facing: -1,
      })
      changed = true
    }
  } else if (next.length > pedTarget) {
    // после reset/смены цели лишних просто отпускаем (уйдут сами), цель добрасываем
    pedTarget = PED_MIN + Math.floor(Math.random() * (PED_MAX - PED_MIN + 1))
  }

  if (changed || next.length !== peds.length) {
    peds = next
    storeRef!.setState({ pedestrians: peds })
  }
}

export function installSimulation(store: Store) {
  storeRef = store
  store.setState({
    // ---------- спавн клиента у двери ----------
    spawnClient: (_now: number) => {
      const s = store.getState()
      const seats = s.totalSeats()
      // лимит потока — по ЧЕЛОВЕКАМ, не по группам
      const peopleLimit = Math.min(seats, maxConcurrentClients(s.level))
      if (s.clients.length >= peopleLimit) return
      // VIP: с 3 уровня, шанс 5% + 1%/ур (макс 15%); всегда одиночный
      const vip = Math.random() < vipChance(s.level)
      // занятые кресла по столам (группа делит стол) и грязные столы
      const occupied = new Map<string, number>()
      for (const c of s.clients) {
        if (c.tableUid) occupied.set(c.tableUid, (occupied.get(c.tableUid) ?? 0) + 1)
      }
      const stained = new Set(
        s.stains.filter((st) => st.kind === 'table').map((st) => st.tableUid),
      )
      const tablesFree = s.items
        .filter((p) => getItem(p.itemId)?.seats && !stained.has(p.uid))
        .map((p) => ({
          item: p,
          free: (getItem(p.itemId)!.seats ?? 0) - (occupied.get(p.uid) ?? 0),
        }))
        .filter((t) => t.free > 0)
      // для VIP — только «престижные» столы рядом с декором (поверх tablesFree:
      // занятые кресла и пятна уже учтены)
      const candidates = vip ? tablesFree.filter((t) => isNearDecor(s.items, t.item)) : tablesFree
      if (!candidates.length) {
        if (vip) {
          // нет престижного стола — VIP ждёт у двери до 20 сек (таймер над головой)
          const waiting: Client = {
            id: nextUid('client'),
            x: 0,
            y: 5, // у стены рядом с ковриком, не блокирует вход
            tx: 0,
            ty: 5,
            phase: 'waiting',
            order: pickOrderEmoji(s.inventory, s.level),
            patience: VIP_PATIENCE_SEC,
            patienceMax: VIP_PATIENCE_SEC,
            bodyColor: '#E8B44A',
            face: '🤵',
            seatIndex: 0,
            facing: 1,
            path: [],
            vip: true,
            waitingUntil: Date.now() + VIP_WAIT_DOOR_MS,
          }
          store.setState({ clients: [...s.clients, waiting] })
          s.pushToast('VIP гость ждёт стол рядом с декором! 👑', 'info')
        }
        return
      }
      // группа? размер 2..min(4, макс. свободных мест за одним столом); VIP — всегда одиночка
      const maxFree = Math.max(...candidates.map((t) => t.free))
      const roomLeft = peopleLimit - s.clients.length
      let size = 1
      if (!vip && maxFree >= 2 && Math.random() < partyChance(s.level)) {
        size = 2 + Math.floor(Math.random() * (Math.min(maxFree, 4) - 1))
        size = Math.min(size, roomLeft)
      }
      if (size < 1) return
      // ищем стол с достаточным числом свободных кресел, до которого реально дойти
      let path: PathCell[] | null = null
      let table: (typeof tablesFree)[number] | undefined
      for (const t of candidates) {
        if (t.free < size) continue
        path = doorPathToItem(s.items, t.item)
        if (path) {
          table = t
          break
        }
      }
      // группе не хватило мест ни за одним достижимым столом — пробуем одиночку
      if ((!table || !path) && size > 1) {
        size = 1
        for (const t of candidates) {
          path = doorPathToItem(s.items, t.item)
          if (path) {
            table = t
            break
          }
        }
      }
      if (!table || !path || !path.length) {
        // пути нет ни к одному столу — клиент заходит, хмурится и уходит с намёком
        const lost: Client = {
          id: nextUid('client'),
          x: DOOR.x,
          y: DOOR.y,
          tx: 0,
          ty: 4, // доходит только до коврика у входа
          phase: 'arriving',
          order: pickOrderEmoji(s.inventory, s.level),
          patience: PATIENCE_SEC,
          bodyColor: pick(CLIENT_COLORS),
          face: pick(CLIENT_FACES),
          seatIndex: 0,
          facing: 1,
          path: [],
        }
        store.setState({ clients: [...s.clients, lost] })
        return
      }
      const [first, ...rest] = path
      const tableDef = getItem(table.item.itemId)!
      const usedSeats = occupied.get(table.item.uid) ?? 0
      const leaderId = nextUid('client')
      const partyId = size > 1 ? leaderId : undefined
      const members: Client[] = []
      for (let i = 0; i < size; i++) {
        members.push({
          id: i === 0 ? leaderId : nextUid('client'),
          // цепочка: каждый следующий член группы чуть позади у двери
          x: DOOR.x - i * 0.7,
          y: DOOR.y,
          tx: first.x,
          ty: first.y,
          phase: 'arriving',
          tableUid: table.item.uid,
          order: pickOrderEmoji(s.inventory, s.level), // у каждого своё блюдо в баббле
          patience: vip ? VIP_PATIENCE_SEC : PATIENCE_SEC,
          patienceMax: vip ? VIP_PATIENCE_SEC : PATIENCE_SEC,
          bodyColor: vip ? '#E8B44A' : pick(CLIENT_COLORS),
          face: vip ? '🤵' : pick(CLIENT_FACES),
          seatIndex: (usedSeats + i) % (tableDef.seats ?? 1), // разные кресла (VIP одиночка — seatIndex 0)
          facing: 1,
          path: [...rest],
          partyId,
          partySize: size > 1 ? size : undefined,
          vip: vip || undefined,
        })
      }
      store.setState({ clients: [...s.clients, ...members] })
      if (vip) s.pushToast('VIP гость в ресторане! 👑', 'info')
    },

    // ---------- начать готовку для ждущего клиента ----------
    startCooking: (clientId: string, now: number, stoveUid?: string) => {
      const s = store.getState()
      if (s.kitchenJobs.some((j) => j.clientId === clientId)) return
      // явный выбор плиты: либо переданная (тап по конкретной плите), либо первая свободная
      // (плита занята, пока на ней ЛЮБОЙ job — готовящийся или ждущий подачи)
      const busyStoves = new Set(s.kitchenJobs.filter((j) => j.stoveUid).map((j) => j.stoveUid))
      const uid =
        stoveUid && s.stoveUids().includes(stoveUid) && !busyStoves.has(stoveUid)
          ? stoveUid
          : s.stoveUids().find((u) => !busyStoves.has(u))
      if (!uid) return
      // 1 заказ = 1 порция: у каждого члена группы свой job (без +30% за партию)
      const client = s.clients.find((c) => c.id === clientId)
      // рецепт блюда: расходуем ингредиенты; не хватает — готовка не стартует
      // (единая проверка и для ручного clickStove, и для автоповара)
      const dish = client ? getDishByEmoji(client.order) : undefined
      const recipe = dish?.recipe ?? {}
      if (!hasIngredients(s.inventory, recipe)) {
        // троттлинг тоста: автоповар вызывает startCooking каждый тик
        if (now - lastIngToastAt > 3000) {
          lastIngToastAt = now
          s.pushToast('Не хватает ингредиентов! Закупись на рынке 🧺', 'error')
        }
        return
      }
      const inventory = { ...s.inventory }
      for (const [ingId, n] of Object.entries(recipe)) {
        inventory[ingId] = (inventory[ingId] ?? 0) - n
      }
      const job: KitchenJob = {
        id: nextUid('job'),
        clientId,
        stoveUid: uid,
        startedAt: now,
        // скорость — от уровня ЭТОЙ плиты (×0.85^(level-1))
        duration: cookDuration(s.hasStaff('cook'), s.stoveLevel(uid)),
        ready: false,
      }
      const stats = { ...s.stats, dishesCooked: s.stats.dishesCooked + 1 }
      store.setState({
        kitchenJobs: [...s.kitchenJobs, job],
        inventory,
        stats,
        ...syncAllQuests({ ...s, stats }),
      })
    },

    // ---------- подача блюда: оплата + чаевые + XP ----------
    serveDish: (jobId: string, now: number) => {
      const s = store.getState()
      const job = s.kitchenJobs.find((j) => j.id === jobId && j.ready)
      if (!job) return
      const client = s.clients.find((c) => c.id === job.clientId)
      if (!client) {
        // сиротский job: клиент уже ушёл — снимаем блюдо с рук, job удаляем, плита свободна
        store.setState({
          kitchenJobs: s.kitchenJobs.filter((j) => j.id !== jobId),
          heldDishId: s.heldDishId === jobId ? null : s.heldDishId,
        })
        s.pushToast('Клиент ушёл 😞', 'error')
        return
      }

      // 1 порция = 1 клиент: чек за каждого члена группы (скидка ×0.9 на порцию сохраняется)
      const partyN = client.partySize ?? 1
      const partyId = client.partyId ?? client.id
      const vip = !!client.vip
      // VIP: чек ×3 (всегда одиночка, групповой множитель не применяется)
      const check = checkAmount(s.level) * (partyN > 1 ? PARTY_CHECK_FACTOR : 1) * (vip ? 3 : 1)
      // час пик: атмосфера +10 (клэмп 50) для чаевых
      const atmo = s.rushActive ? Math.min(50, s.atmosphere() + RUSH_TIP_BONUS) : s.atmosphere()
      // VIP: щедрые чаевые 15–30% от чека; обычные — формула атмосферы
      const tip = vip
        ? Math.round(check * (0.15 + Math.random() * 0.15))
        : tipAmount(check, atmo)
      // «Идеальное обслуживание»: окно 15с от момента ГОТОВНОСТИ блюда (а не посадки),
      // иначе время готовки несправедливо съедает бонус
      const readyAt = job.readyAt ?? job.startedAt + job.duration * 1000
      const perfect = (now - readyAt) / 1000 < PERFECT_SERVICE_SEC
      let total = check + tip
      if (perfect) total = Math.round(total * 1.5)
      total = Math.round(total)
      // VIP при идеальном обслуживании: шанс 20% на +1💎
      const vipGem = vip && perfect && Math.random() < VIP_GEM_CHANCE

      const stats = { ...s.stats }
      stats.servedClients += 1 // порция = один обслуженный клиент
      stats.coinsEarned += total
      if (vip) stats.vipServed += 1 // «Первый VIP»: обслужен без разворота

      const table = s.items.find((i) => i.uid === client.tableUid)
      const fx = table ? table.x : client.x
      const fy = table ? table.y : client.y

      // трапеза получившего порцию: ровно EAT_SEC игровых секунд (таймер реального времени / speed)
      const eatStart = now
      const eatEnd = now + (EAT_SEC * 1000) / s.speed
      // отзыв — один от группы: когда последний сидящий член партии получил свою порцию
      const lastServed =
        partyN === 1 ||
        !s.clients.some(
          (c) => c.id !== client.id && (c.partyId ?? c.id) === partyId && c.phase === 'seated',
        )
      if (lastServed) stats.goodReviews += 1

      store.setState({
        coins: s.coins + total,
        gems: vipGem ? s.gems + 1 : s.gems,
        reputation: s.reputation + (vip ? VIP_REP_SERVE : repPerClient(s.level)),
        clients: s.clients.map((c) =>
          c.id === client.id && c.phase === 'seated'
            ? { ...c, phase: 'eating' as const, eatStart, eatEnd }
            : c,
        ),
        kitchenJobs: s.kitchenJobs.filter((j) => j.id !== jobId),
        heldDishId: s.heldDishId === jobId ? null : s.heldDishId,
        stats,
        ...syncAllQuests({ ...s, stats }),
      })
      s.spawnFloat(fx, fy, `+${total}🪙`, 'coin')
      if (vip) s.spawnFloat(fx, fy - 0.5, `VIP! +${VIP_REP_SERVE}⭐ 👑`, 'xp')
      if (perfect) s.spawnFloat(fx, fy - (vip ? 1 : 0.5), 'Идеально! ×1.5 ⭐', 'xp')
      if (vipGem) s.pushToast('VIP оценил сервис: +1💎!', 'success')
      s.addXp(xpPerClient(s.level))
    },

    // ---------- «Готовить» заказ-доставку: порция на свободной плите ----------
    startDeliveryCooking: (deliveryId: string, now: number) => {
      const s = store.getState()
      if (s.mode !== 'live') return
      const d = s.deliveries.find((x) => x.id === deliveryId && x.state === 'active')
      if (!d) return
      // все порции уже готовы или готовятся — ждём курьера
      const inProgress = s.kitchenJobs.filter(
        (j) => j.kind === 'delivery' && j.deliveryId === deliveryId,
      ).length
      if (d.cooked + inProgress >= d.qty) {
        s.pushToast('Все порции уже готовятся 🛵', 'info')
        return
      }
      // строго свободная плита: на ней нет ни готовящегося, ни готового блюда
      const busyStoves = new Set(s.kitchenJobs.map((j) => j.stoveUid))
      const uid = s.stoveUids().find((u) => !busyStoves.has(u))
      if (!uid) {
        s.pushToast('Нет свободной плиты 🍳', 'error')
        return
      }
      // рецепт блюда доставки: расходуем ингредиенты; не хватает — не стартуем
      const dDish = getDishByEmoji(d.dish)
      const dRecipe = dDish?.recipe ?? {}
      if (!hasIngredients(s.inventory, dRecipe)) {
        if (now - lastIngToastAt > 3000) {
          lastIngToastAt = now
          s.pushToast('Не хватает ингредиентов! Закупись на рынке 🧺', 'error')
        }
        return
      }
      const dInventory = { ...s.inventory }
      for (const [ingId, n] of Object.entries(dRecipe)) {
        dInventory[ingId] = (dInventory[ingId] ?? 0) - n
      }
      const job: KitchenJob = {
        id: nextUid('job'),
        clientId: `delivery:${deliveryId}`,
        kind: 'delivery',
        deliveryId,
        stoveUid: uid,
        startedAt: now,
        duration: cookDuration(s.hasStaff('cook'), s.stoveLevel(uid)),
        ready: false,
      }
      store.setState({ kitchenJobs: [...s.kitchenJobs, job], inventory: dInventory })
    },

    // ---------- главный тик ----------
    simTick: (dtSec: number, now: number) => {
      const s = store.getState()
      if (s.mode !== 'live') return
      // Скорость игры ×1/×2 — масштабируем игровое время
      dtSec *= s.speed

      // --- персонал: на каждый нанятый слот — свой NPC ---
      ensureStaffNpcs(s)

      // --- ежедневные квесты: сброс в 00:00 мск ---
      s.ensureDailyQuests()

      // --- прохожие на улице (анимация, не влияет на баланс) ---
      tickPedestrians(dtSec, now)

      // --- час пик 🔥: каждые 4–6 мин реального времени событие на 60 сек ---
      if (!nextRushAt) nextRushAt = rollNextRush(now)
      if (!s.rushActive && now >= nextRushAt) {
        store.setState({ rushActive: true, rushEndsAt: now + RUSH_DURATION_MS })
        nextRushAt = 0
        s.pushToast('Час пик! 🔥 Гостей в 2 раза больше', 'success')
      } else if (s.rushActive && now >= s.rushEndsAt) {
        store.setState({ rushActive: false, rushEndsAt: 0 })
        nextRushAt = rollNextRush(now)
        s.pushToast('Час пик закончился 😌', 'info')
      }

      // --- заказы-доставки 🛵: появление каждые 90–150 сек (со 2 уровня, макс 2 активных) ---
      {
        const st = store.getState()
        if (st.level >= DELIVERY_MIN_LEVEL) {
          if (!st.nextDeliveryAt) {
            store.setState({ nextDeliveryAt: rollNextDelivery(now) })
          } else if (now >= st.nextDeliveryAt) {
            if (st.deliveries.length < MAX_ACTIVE_DELIVERIES) {
              const order = rollDeliveryOrder(st.level, now)
              store.setState({
                deliveries: [...st.deliveries, order],
                nextDeliveryAt: rollNextDelivery(now),
              })
              st.pushToast(`Заказ-доставка! 🛵 ${order.dish}×${order.qty} — успей до дедлайна`, 'info')
            } else {
              // оба слота заняты — следующая попытка позже
              store.setState({ nextDeliveryAt: now + DELIVERY_RETRY_MS })
            }
          }
        }
      }

      // --- спавн по темпу 0.9 + 0.06×ур клиентов/мин (в час пик ×2) ---
      spawnAccum += dtSec
      const interval =
        60 /
        (clientsPerMinute(s.level) *
          (1 + facadeBonusPct(s.items) / 100) *
          (store.getState().rushActive ? RUSH_SPAWN_MULT : 1))
      if (spawnAccum >= interval) {
        spawnAccum = 0
        const before = s.clients.length
        s.spawnClient(now)
        if (store.getState().clients.length === before) spawnAccum = interval * 0.5 // столы заняты — попробуем позже
      }

      // --- готовка: таймеры ---
      let jobs = store.getState().kitchenJobs
      const jobsChanged = jobs.some((j) => !j.ready && now - j.startedAt >= j.duration * 1000)
      if (jobsChanged) {
        jobs = jobs.map((j) =>
          !j.ready && now - j.startedAt >= j.duration * 1000
            ? { ...j, ready: true, readyAt: now }
            : j,
        )
        store.setState({ kitchenJobs: jobs })
      }

      // --- доставки: курьер мгновенно забирает готовые порции ---
      {
        const st = store.getState()
        const readyDelivery = st.kitchenJobs.filter((j) => j.kind === 'delivery' && j.ready)
        if (readyDelivery.length) {
          const taken = new Set(readyDelivery.map((j) => j.id))
          const doneOrders: { reward: number; xp: number }[] = []
          let deliveries = st.deliveries.map((d) => {
            if (d.state !== 'active') return d
            const portions = readyDelivery.filter((j) => j.deliveryId === d.id).length
            if (!portions) return d
            const cooked = d.cooked + portions
            if (cooked >= d.qty) doneOrders.push({ reward: d.reward, xp: d.xp })
            return { ...d, cooked, state: cooked >= d.qty ? ('done' as const) : d.state }
          })
          // история не нужна — завершённые уходят из списка
          deliveries = deliveries.filter((d) => d.state === 'active')
          store.setState({
            kitchenJobs: st.kitchenJobs.filter((j) => !taken.has(j.id)),
            deliveries,
            coins: st.coins + doneOrders.reduce((a, o) => a + o.reward, 0),
          })
          for (const o of doneOrders) {
            store.getState().pushToast(`Доставка выполнена! +${o.reward}🪙`, 'success')
            store.getState().addXp(o.xp)
          }
        }
      }

      // --- доставки: дедлайн прошёл — заказ failed, −2⭐ ---
      {
        const st = store.getState()
        const expired = st.deliveries.filter((d) => d.state === 'active' && now >= d.expiresAt)
        if (expired.length) {
          const ids = new Set(expired.map((d) => d.id))
          store.setState({
            deliveries: st.deliveries.filter((d) => !ids.has(d.id)),
            // недоготовленные порции снимаем с плит
            kitchenJobs: st.kitchenJobs.filter(
              (j) => !(j.kind === 'delivery' && j.deliveryId && ids.has(j.deliveryId)),
            ),
            reputation: Math.max(0, st.reputation - DELIVERY_REP_PENALTY * expired.length),
          })
          st.pushToast(`Доставка провалена! −${DELIVERY_REP_PENALTY}⭐ 😞`, 'error')
        }
      }

      const cur = store.getState()

      // --- NPC персонала: повара у СВОИХ плит (1 повар = 1 плита), официанты носят блюда ---
      if (cur.cooks.length) {
        const st = store.getState()
        // резервации рабочих клеток поваров на этот тик (старт — текущие позиции)
        const takenCells = new Set<string>(
          st.cooks.map((c) => `${Math.round(c.x)},${Math.round(c.y)}`),
        )
        const cooks = st.cooks.map((c, i) => tickCook(store.getState(), dtSec, c, i, takenCells))
        if (cooks.some((c, i) => c !== st.cooks[i])) store.setState({ cooks })
      }
      if (cur.waiters.length) {
        const claimedJobs = new Set<string>()
        const st = store.getState()
        const waiters = st.waiters.map((w) => tickWaiter(store.getState(), dtSec, now, w, claimedJobs))
        if (waiters.some((w, i) => w !== st.waiters[i])) store.setState({ waiters })
      }

      // --- повар(а): сами берут заказы. Порции FIFO по времени посадки; стартуем
      // на КАЖДОЙ свободной плите — в т.ч. только что освобождённой официантом
      // (блюдо забрано → job ушёл с плиты → новая порция в этом же тике) ---
      if (cur.hasStaff('cook')) {
        for (;;) {
          const st = store.getState()
          const busy = new Set(st.kitchenJobs.filter((j) => j.stoveUid).map((j) => j.stoveUid))
          // только плита со СВОИМ поваром (i-я плита → i-й повар), повар не занят
          // готовкой (working); плит без повара автоповар не трогает — 1 повар = 1 плита
          const uids = st.stoveUids()
          const freeStove = uids.find(
            (u, idx) => !busy.has(u) && idx < st.cooks.length && st.cooks[idx].phase !== 'working',
          )
          if (!freeStove) break
          if (st.kitchenJobs.filter((j) => !j.ready).length >= st.maxConcurrentOrders()) break
          const waiting = st.clients
            .filter(
              (c) => c.phase === 'seated' && !st.kitchenJobs.some((j) => j.clientId === c.id),
            )
            .sort((a, b) => (a.seatedAt ?? 0) - (b.seatedAt ?? 0))[0]
          if (!waiting) break
          const before = st.kitchenJobs.length
          st.startCooking(waiting.id, now, freeStove)
          if (store.getState().kitchenJobs.length === before) break // не хватило ингредиентов и т.п.
        }
      }

      // --- клиенты: движение / терпение / еда / уход ---
      let changed = false
      const floats: [number, number, string, 'coin' | 'xp' | 'rep-down'][] = []
      let repLoss = 0
      let repHint = false // клиент не нашёл прохода к столам
      let vipLeftAngry = false // VIP не дождался престижного стола
      const itemsRef = store.getState().items
      const angryPartyIds = new Set<string>() // группы, чей лидер ушёл недовольным на этом тике
      let clients = store
        .getState()
        .clients.map((c) => {
          if (c.phase === 'arriving' || c.phase === 'leaving' || c.phase === 'angry-leaving') {
            // продвижение по waypoints пути (tx/ty — текущая цель)
            const adv = advanceWaypoint(c, c.x, c.y)
            const cur2 = { ...c, ...adv }
            const moved = moveToward(cur2, dtSec)
            changed = true
            if (!moved) {
              if (c.phase === 'arriving') {
                if (!cur2.tableUid) {
                  // зашёл, а прохода к столам нет — уходит с намёком
                  floats.push([cur2.x, cur2.y, 'Где проход? 🚧', 'rep-down'])
                  repHint = true
                  const back = pathToDoor(itemsRef, cur2.x, cur2.y)
                  return leaveWithPath(cur2, back, 'angry-leaving')
                }
                return { ...cur2, phase: 'seated' as const, seatedAt: now }
              }
              return null // дошёл до двери — исчезает
            }
            return { ...cur2, ...moved }
          }
          if (c.phase === 'waiting') {
            // VIP ждёт у двери: каждый тик пробуем посадить за престижный стол
            changed = true // перерисовка таймера над головой
            const seatedVip = seatVip(store.getState(), c)
            if (seatedVip) return seatedVip
            if (c.waitingUntil !== undefined && now >= c.waitingUntil) {
              // не дождался — уходит angry: −5⭐ репутации
              floats.push([c.x, c.y, `-${VIP_REP_LOSS}⭐`, 'rep-down'])
              repLoss += VIP_REP_LOSS
              vipLeftAngry = true
              const back = pathToDoor(itemsRef, c.x, c.y)
              return leaveWithPath({ ...c, waitingUntil: undefined }, back, 'angry-leaving')
            }
            return c
          }
          if (c.phase === 'seated') {
            const patience = c.patience - dtSec
            changed = true
            if (patience <= 0) {
              // терпение общее: решение принимает лидер группы, члены ждут его
              if (c.partyId && c.partyId !== c.id) return { ...c, patience: Math.max(patience, 0) }
              floats.push([c.x, c.y, '-2⭐', 'rep-down'])
              repLoss += 2 // реально вычитаем 2⭐ за angry-уход (клэмп ниже); один раз за группу
              angryPartyIds.add(c.partyId ?? c.id)
              const back = pathToDoor(itemsRef, c.x, c.y)
              maybeSpawnStain(c.tableUid, now) // недовольный тоже мусорит (за себя)
              return {
                ...leaveWithPath({ ...c, patience: 0 }, back, 'angry-leaving'),
                tableUid: undefined,
              }
            }
            return { ...c, patience }
          }
          if (c.phase === 'eating') {
            // трапеза ровно 15с от получения порции (таймер — на клиенте: eatStart/eatEnd)
            if (c.eatEnd !== undefined && now >= c.eatEnd) {
              const partyId = c.partyId ?? c.id
              // группа уходит вместе: ждём, пока доедят все члены партии
              const someoneEating = store
                .getState()
                .clients.some(
                  (o) =>
                    o.id !== c.id &&
                    (o.partyId ?? o.id) === partyId &&
                    o.phase === 'eating' &&
                    (o.eatEnd ?? 0) > now,
                )
              if (someoneEating) return c // сидим довольные, ждём остальных
              changed = true
              const back = pathToDoor(itemsRef, c.x, c.y)
              maybeSpawnStain(c.tableUid, now) // довольный клиент тоже может оставить грязь
              return {
                ...leaveWithPath({ ...c, eatStart: undefined, eatEnd: undefined }, back, 'leaving'),
                tableUid: undefined,
              }
            }
            return c
          }
          return c
        })
        .filter((c): c is Client => c !== null)

      // группа уходит вместе: члены angry-партии, ещё сидящие за столом, встают и уходят
      if (angryPartyIds.size) {
        clients = clients.map((c) => {
          if (c.phase !== 'seated' || !c.partyId || !angryPartyIds.has(c.partyId)) return c
          maybeSpawnStain(c.tableUid, now) // мусор — за каждого члена группы
          return {
            ...leaveWithPath({ ...c, patience: 0 }, pathToDoor(itemsRef, c.x, c.y), 'angry-leaving'),
            tableUid: undefined,
          }
        })
      }

      // сиротские kitchenJob: клиент ушёл (angry/довольный/исчез) — его заказы снимаем,
      // плита освобождается; блюдо «в руках» такого клиента сбрасываем
      const servable = new Set(
        clients
          .filter(
            (c) =>
              c.phase === 'arriving' ||
              c.phase === 'waiting' ||
              c.phase === 'seated' ||
              c.phase === 'eating',
          )
          .map((c) => c.id),
      )
      const curJobs = store.getState().kitchenJobs
      const orphanJobs = curJobs.filter((j) => j.kind !== 'delivery' && !servable.has(j.clientId))
      let jobsPatch: typeof curJobs | undefined
      let heldCleared = false
      if (orphanJobs.length) {
        const orphanIds = new Set(orphanJobs.map((j) => j.id))
        jobsPatch = curJobs.filter((j) => j.kind === 'delivery' || servable.has(j.clientId))
        const held = store.getState().heldDishId
        if (held && orphanIds.has(held)) heldCleared = true
      }

      if (
        changed ||
        repLoss > 0 ||
        jobsPatch !== undefined ||
        clients.length !== store.getState().clients.length
      ) {
        const patch: Partial<ReturnType<Store['getState']>> = { clients }
        if (jobsPatch) patch.kitchenJobs = jobsPatch
        if (heldCleared) patch.heldDishId = null
        if (repLoss) patch.reputation = Math.max(0, store.getState().reputation - repLoss)
        store.setState(patch)
        if (heldCleared) store.getState().pushToast('Клиент ушёл 😞', 'error')
      }
      for (const [x, y, text, kind] of floats) store.getState().spawnFloat(x, y, text, kind)
      if (repHint) store.getState().pushToast('К столу не пройти! 🚧', 'error')
      if (vipLeftAngry) store.getState().pushToast('VIP ушёл! 😤', 'error')

      // --- грязь: уборщик берёт пятна по очереди (~6с на пятно) ---
      if (cur.hasStaff('cleaner')) {
        const st = store.getState()
        if (!st.stains.some((x) => x.cleaning)) {
          const target = st.stains[0]
          if (target) {
            store.setState({
              stains: st.stains.map((x) =>
                x.id === target.id
                  ? { ...x, cleaning: { startedAt: now, durationMs: CLEAN_CLEANER_MS, by: 'cleaner' as const } }
                  : x,
              ),
            })
          }
        }
      }

      // --- грязь: завершение уборки (тап 1.5с / уборщик 6с) → +2🪙, stainsCleaned++ ---
      {
        const st = store.getState()
        const finished = st.stains.filter((x) => x.cleaning && now - x.cleaning.startedAt >= x.cleaning.durationMs)
        if (finished.length) {
          const stats = { ...st.stats, stainsCleaned: st.stats.stainsCleaned + finished.length }
          store.setState({
            stains: st.stains.filter((x) => !finished.some((f) => f.id === x.id)),
            coins: st.coins + 2 * finished.length,
            stats,
            ...syncAllQuests({ ...st, stats }),
          })
          for (const f of finished) {
            store.getState().spawnFloat(f.x, f.y, '✨ +2🪙', 'coin')
          }
        }
      }
    },
  })
}
