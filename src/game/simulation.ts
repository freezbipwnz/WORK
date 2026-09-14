// Тик-симуляция RestoCity: спавн клиентов → посадка → заказ → готовка → подача → оплата.
// Вызывается из GameScreen через setInterval (250ms). В build mode игра на паузе —
// tick не вызывается, терпение не тикает.

import type { Client, KitchenJob } from './types'
import {
  CLIENT_COLORS,
  CLIENT_FACES,
  DOOR,
  ORDER_EMOJIS,
  checkAmount,
  clientsPerMinute,
  cookDuration,
  getItem,
  repPerClient,
  tipAmount,
} from './catalog'
import { nextUid, type useGameStore } from './store'

type Store = typeof useGameStore

const MOVE_STEP_SEC = 0.15 // 1 клетка за 150ms
const EAT_SEC = 3
const PATIENCE_SEC = 30
const PERFECT_SERVICE_SEC = 15

const lastMove = new Map<string, number>()
const eatUntil = new Map<string, number>()
let spawnAccum = 0

// ссылка на стор для модульных функций паузы/сдвига таймеров
let storeRef: Store | null = null

/** Полный сброс модульного состояния симуляции (вызывается из resetGame) */
export function resetSimulation() {
  lastMove.clear()
  eatUntil.clear()
  spawnAccum = 0
}

/** Сдвиг всех таймеров реального времени (startedAt/readyAt/seatedAt/eatUntil/lastMove) на ms —
 *  чтобы пауза (build mode, скрытая вкладка) не дозревала готовку/терпение */
function shiftRealtimeTimers(ms: number) {
  if (ms <= 0) return
  for (const [k, v] of eatUntil) eatUntil.set(k, v + ms)
  for (const [k, v] of lastMove) lastMove.set(k, v + ms)
  const s = storeRef?.getState()
  if (!s) return
  storeRef!.setState({
    kitchenJobs: s.kitchenJobs.map((j) => ({
      ...j,
      startedAt: j.startedAt + ms,
      readyAt: j.readyAt !== undefined ? j.readyAt + ms : undefined,
    })),
    clients: s.clients.map((c) =>
      c.seatedAt !== undefined ? { ...c, seatedAt: c.seatedAt + ms } : c,
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

/** Один шаг по сетке к цели (прямой путь, упрощённый обход: сначала X, потом Y) */
function stepToward(c: Client): Pick<Client, 'x' | 'y'> {
  if (c.x !== c.tx) return { x: c.x + Math.sign(c.tx - c.x), y: c.y }
  if (c.y !== c.ty) return { x: c.x, y: c.y + Math.sign(c.ty - c.y) }
  return { x: c.x, y: c.y }
}

export function installSimulation(store: Store) {
  storeRef = store
  store.setState({
    // ---------- спавн клиента у двери ----------
    spawnClient: (now: number) => {
      const s = store.getState()
      const seats = s.totalSeats()
      if (s.clients.length >= seats) return
      // свободный стол: нет клиента с этим tableUid
      const busy = new Set(s.clients.map((c) => c.tableUid).filter(Boolean))
      const table = s.items.find(
        (p) => getItem(p.itemId)?.seats && !busy.has(p.uid),
      )
      if (!table) return
      const client: Client = {
        id: nextUid('client'),
        x: DOOR.x,
        y: DOOR.y,
        tx: table.x,
        ty: table.y,
        phase: 'arriving',
        tableUid: table.uid,
        order: pick(ORDER_EMOJIS),
        patience: PATIENCE_SEC,
        bodyColor: pick(CLIENT_COLORS),
        face: pick(CLIENT_FACES),
      }
      lastMove.set(client.id, now)
      store.setState({ clients: [...s.clients, client] })
    },

    // ---------- начать готовку для ждущего клиента ----------
    startCooking: (clientId: string, now: number) => {
      const s = store.getState()
      if (s.kitchenJobs.some((j) => j.clientId === clientId)) return
      const busyStoves = new Set(s.kitchenJobs.filter((j) => !j.ready).map((j) => j.stoveUid))
      const stoveUid = s.stoveUids().find((uid) => !busyStoves.has(uid))
      if (!stoveUid) return
      const job: KitchenJob = {
        id: nextUid('job'),
        clientId,
        stoveUid,
        startedAt: now,
        duration: cookDuration(s.hasStaff('cook'), s.items.some((i) => i.itemId === 'cutting_table')),
        ready: false,
      }
      store.setState({ kitchenJobs: [...s.kitchenJobs, job] })
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

      const check = checkAmount(s.level)
      const tip = tipAmount(check, s.atmosphere())
      // «Идеальное обслуживание»: окно 15с от момента ГОТОВНОСТИ блюда (а не посадки),
      // иначе время готовки несправедливо съедает бонус
      const readyAt = job.readyAt ?? job.startedAt + job.duration * 1000
      const perfect = (now - readyAt) / 1000 < PERFECT_SERVICE_SEC
      let total = check + tip
      if (perfect) total = Math.round(total * 1.5)

      const stats = { ...s.stats }
      stats.servedClients += 1
      stats.goodReviews += 1

      const table = s.items.find((i) => i.uid === client.tableUid)
      const fx = table ? table.x : client.x
      const fy = table ? table.y : client.y

      store.setState({
        coins: s.coins + total,
        reputation: s.reputation + repPerClient(s.level),
        clients: s.clients.map((c) =>
          c.id === client.id ? { ...c, phase: 'eating' as const } : c,
        ),
        kitchenJobs: s.kitchenJobs.filter((j) => j.id !== jobId),
        heldDishId: s.heldDishId === jobId ? null : s.heldDishId,
        stats,
        quests: s.quests.map((q) =>
          q.claimed
            ? q
            : {
                ...q,
                progress: Math.min(
                  q.target,
                  q.id === 'first_guest'
                    ? stats.servedClients
                    : q.id === 'happy_faces'
                      ? stats.goodReviews
                      : q.progress,
                ),
              },
        ),
      })
      eatUntil.set(client.id, now + (EAT_SEC * 1000) / s.speed)
      s.spawnFloat(fx, fy, `+${total}🪙`, 'coin')
      if (perfect) s.spawnFloat(fx, fy - 0.5, 'Идеально! ×1.5 ⭐', 'xp')
      s.addXp(Math.round(repPerClient(s.level)))
    },

    // ---------- главный тик ----------
    simTick: (dtSec: number, now: number) => {
      const s = store.getState()
      if (s.mode !== 'live') return
      // Скорость игры ×1/×2 — масштабируем игровое время
      dtSec *= s.speed

      // --- спавн по темпу 0.6 + 0.04×ур клиентов/мин ---
      spawnAccum += dtSec
      const interval = 60 / clientsPerMinute(s.level)
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

      const cur = store.getState()

      // --- повар: сам берёт заказы ---
      if (cur.hasStaff('cook')) {
        const activeOrders = cur.kitchenJobs.filter((j) => !j.ready).length
        if (activeOrders < cur.maxConcurrentOrders()) {
          const waiting = cur.clients.find(
            (c) => c.phase === 'seated' && !cur.kitchenJobs.some((j) => j.clientId === c.id),
          )
          if (waiting) cur.startCooking(waiting.id, now)
        }
      }

      // --- официант: сам подаёт готовые блюда ---
      if (cur.hasStaff('waiter')) {
        const ready = store.getState().kitchenJobs.find((j) => j.ready)
        if (ready) cur.serveDish(ready.id, now)
      }

      // --- клиенты: движение / терпение / еда / уход ---
      let changed = false
      const floats: [number, number, string, 'coin' | 'xp' | 'rep-down'][] = []
      let repLoss = 0
      // строб ходьбы игровым временем: при speed ×2 шаги вдвое чаще
      const moveStepMs = (MOVE_STEP_SEC * 1000) / s.speed
      let clients = store
        .getState()
        .clients.map((c) => {
          if (c.phase === 'arriving' || c.phase === 'leaving' || c.phase === 'angry-leaving') {
            const last = lastMove.get(c.id) ?? 0
            if (now - last < moveStepMs) return c
            lastMove.set(c.id, now)
            const { x, y } = stepToward(c)
            changed = true
            if (x === c.tx && y === c.ty) {
              if (c.phase === 'arriving') {
                return { ...c, x, y, phase: 'seated' as const, seatedAt: now }
              }
              return null // дошёл до двери — исчезает
            }
            return { ...c, x, y }
          }
          if (c.phase === 'seated') {
            const patience = c.patience - dtSec
            changed = true
            if (patience <= 0) {
              floats.push([c.x, c.y, '-2⭐', 'rep-down'])
              repLoss += 2 // реально вычитаем 2⭐ за angry-уход (клэмп ниже)
              return {
                ...c,
                patience: 0,
                phase: 'angry-leaving' as const,
                tx: DOOR.x,
                ty: DOOR.y,
                tableUid: undefined,
              }
            }
            return { ...c, patience }
          }
          if (c.phase === 'eating') {
            const until = eatUntil.get(c.id)
            if (until !== undefined && now >= until) {
              eatUntil.delete(c.id)
              changed = true
              return { ...c, phase: 'leaving' as const, tx: DOOR.x, ty: DOOR.y, tableUid: undefined }
            }
            return c
          }
          return c
        })
        .filter((c): c is Client => c !== null)

      // очистка завершённых клиентов
      const aliveIds = new Set(clients.map((c) => c.id))
      for (const id of [...lastMove.keys()]) if (!aliveIds.has(id)) lastMove.delete(id)

      // сиротские kitchenJob: клиент ушёл (angry/довольный/исчез) — его заказы снимаем,
      // плита освобождается; блюдо «в руках» такого клиента сбрасываем
      const servable = new Set(
        clients
          .filter((c) => c.phase === 'arriving' || c.phase === 'seated' || c.phase === 'eating')
          .map((c) => c.id),
      )
      const curJobs = store.getState().kitchenJobs
      const orphanJobs = curJobs.filter((j) => !servable.has(j.clientId))
      let jobsPatch: typeof curJobs | undefined
      let heldCleared = false
      if (orphanJobs.length) {
        const orphanIds = new Set(orphanJobs.map((j) => j.id))
        jobsPatch = curJobs.filter((j) => servable.has(j.clientId))
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
    },
  })
}
