// A*/BFS pathfinding по occupancy-сетке сцены (зал + кухня справа).
// РАЗМЕР сетки зависит от уровня расширения зала (ТЗ §1.2): каждая функция
// принимает exp (0 — базовая сетка). Сетка пересчитывается только при смене
// ссылки на массив items ИЛИ уровня расширения (иммутабельные обновления
// стора = «версия»), пути дверь→стол кэшируются per items+expansion+tableUid.

import { KITCHEN_W, hallHAt, hallWAt, getItem } from './catalog'
import type { PathCell, PlacedItem } from './types'

/** Клетка входа — всегда проходима (коврик у двери) */
export const ENTRY: PathCell = { x: 0, y: 4 }

/** Размер сетки проходимости на уровне расширения exp: зал + кухня справа */
export function gridSizeAt(exp: number): { w: number; h: number } {
  return { w: hallWAt(exp) + KITCHEN_W, h: hallHAt(exp) }
}

const key = (x: number, y: number) => `${x},${y}`

// ---------- occupancy grid (кэш по ссылке на items + уровню расширения) ----------
let gridCache: {
  items: PlacedItem[]
  exp: number
  w: number
  h: number
  grid: Uint8Array
} | null = null

/**
 * 1 = проходимо. Footprint каждого предмета помечает клетки занятыми, вход — нет.
 * Возвращает сетку вместе с её размером на этом уровне расширения.
 */
export function gridFor(items: PlacedItem[], exp: number): { w: number; h: number; grid: Uint8Array } {
  const { w, h } = gridSizeAt(exp)
  if (gridCache && gridCache.items === items && gridCache.exp === exp) {
    return gridCache
  }
  const idx = (x: number, y: number) => y * w + x
  const inGrid = (x: number, y: number) => x >= 0 && x < w && y >= 0 && y < h
  const grid = new Uint8Array(w * h).fill(1)
  for (const p of items) {
    const def = getItem(p.itemId)
    if (!def) continue
    for (let dy = 0; dy < def.h; dy++) {
      for (let dx = 0; dx < def.w; dx++) {
        const x = p.x + dx
        const y = p.y + dy
        if (inGrid(x, y)) grid[idx(x, y)] = 0
      }
    }
  }
  grid[idx(ENTRY.x, ENTRY.y)] = 1 // дверь/вход всегда проходимы
  gridCache = { items, exp, w, h, grid }
  return gridCache
}

export function isWalkable(items: PlacedItem[], x: number, y: number, exp: number): boolean {
  const { w, h, grid } = gridFor(items, exp)
  return x >= 0 && x < w && y >= 0 && y < h && grid[y * w + x] === 1
}

// ---------- BFS (сетка крошечная, A* не нужен) ----------

const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const

/**
 * BFS от (sx,sy) до ближайшей клетки из targets (множество "x,y").
 * Целевая клетка должна быть проходимой. Возвращает путь [start..goal] или null.
 */
export function findPathToTargets(
  items: PlacedItem[],
  sx: number,
  sy: number,
  targets: ReadonlySet<string>,
  exp: number,
): PathCell[] | null {
  const { w, h, grid } = gridFor(items, exp)
  const idx = (x: number, y: number) => y * w + x
  if (sx < 0 || sx >= w || sy < 0 || sy >= h) return null
  if (grid[idx(sx, sy)] !== 1) return null
  const prev = new Int32Array(w * h).fill(-1)
  const seen = new Uint8Array(w * h)
  const queue: number[] = [idx(sx, sy)]
  seen[idx(sx, sy)] = 1
  let goal = -1
  for (let qi = 0; qi < queue.length; qi++) {
    const cur = queue[qi]
    const cx = cur % w
    const cy = (cur / w) | 0
    if (targets.has(key(cx, cy))) {
      goal = cur
      break
    }
    for (const [dx, dy] of DIRS) {
      const nx = cx + dx
      const ny = cy + dy
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue
      const ni = idx(nx, ny)
      if (seen[ni] || grid[ni] !== 1) continue
      seen[ni] = 1
      prev[ni] = cur
      queue.push(ni)
    }
  }
  if (goal < 0) return null
  const path: PathCell[] = []
  for (let c = goal; c >= 0; c = prev[c]) path.push({ x: c % w, y: (c / w) | 0 })
  return path.reverse()
}

/** Путь между двумя конкретными клетками */
export function findPath(
  items: PlacedItem[],
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  exp: number,
): PathCell[] | null {
  return findPathToTargets(items, sx, sy, new Set([key(tx, ty)]), exp)
}

/** Множество проходимых клеток, соседних (4-направления) с footprint предмета */
export function adjacentWalkableKeys(items: PlacedItem[], p: PlacedItem, exp: number): Set<string> {
  const def = getItem(p.itemId)
  const out = new Set<string>()
  if (!def) return out
  for (let dy = -1; dy <= def.h; dy++) {
    for (let dx = -1; dx <= def.w; dx++) {
      const onEdge = dy === -1 || dy === def.h || dx === -1 || dx === def.w
      if (!onEdge) continue
      const x = p.x + dx
      const y = p.y + dy
      if (isWalkable(items, x, y, exp)) out.add(key(x, y))
    }
  }
  return out
}

/** BFS-обход от входа: все достижимые от двери клетки */
export function reachableFromEntry(items: PlacedItem[], exp: number): Set<string> {
  const { w, h, grid } = gridFor(items, exp)
  const idx = (x: number, y: number) => y * w + x
  const out = new Set<string>()
  const queue: number[] = [idx(ENTRY.x, ENTRY.y)]
  const seen = new Uint8Array(w * h)
  seen[idx(ENTRY.x, ENTRY.y)] = 1
  for (let qi = 0; qi < queue.length; qi++) {
    const cur = queue[qi]
    const cx = cur % w
    const cy = (cur / w) | 0
    out.add(key(cx, cy))
    for (const [dx, dy] of DIRS) {
      const nx = cx + dx
      const ny = cy + dy
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue
      const ni = idx(nx, ny)
      if (seen[ni] || grid[ni] !== 1) continue
      seen[ni] = 1
      queue.push(ni)
    }
  }
  return out
}

/**
 * Валидация расстановки: клетка входа не застроена, к КАЖДОМУ столу и
 * КАЖДОЙ плите есть подход от двери (кухня достижима через плиты).
 */
export function placementKeepsPaths(items: PlacedItem[], exp: number): boolean {
  // вход (0,4) не должен перекрываться footprint'ом
  for (const p of items) {
    const def = getItem(p.itemId)
    if (!def) continue
    if (ENTRY.x >= p.x && ENTRY.x < p.x + def.w && ENTRY.y >= p.y && ENTRY.y < p.y + def.h) {
      return false
    }
  }
  const reach = reachableFromEntry(items, exp)
  for (const p of items) {
    const def = getItem(p.itemId)
    if (!def) continue
    if (!def.seats && !def.isStove) continue
    const adj = adjacentWalkableKeys(items, p, exp)
    let ok = false
    for (const k of adj) {
      if (reach.has(k)) {
        ok = true
        break
      }
    }
    if (!ok) return false
  }
  return true
}

// ---------- кэш путей дверь→стол (инвалидация по items + уровню расширения) ----------
let doorPathCache: {
  items: PlacedItem[]
  exp: number
  map: Map<string, PathCell[] | null>
} | null = null

/** Путь от входа (0,4) до ближайшей свободной клетки рядом со столом (кэш per items+expansion+uid) */
export function doorPathToItem(items: PlacedItem[], p: PlacedItem, exp: number): PathCell[] | null {
  if (!doorPathCache || doorPathCache.items !== items || doorPathCache.exp !== exp) {
    doorPathCache = { items, exp, map: new Map() }
  }
  const hit = doorPathCache.map.get(p.uid)
  if (hit !== undefined) return hit
  const adj = adjacentWalkableKeys(items, p, exp)
  const path = adj.size ? findPathToTargets(items, ENTRY.x, ENTRY.y, adj, exp) : null
  doorPathCache.map.set(p.uid, path)
  return path
}

/** Путь от произвольной клетки до соседней с предметом (NPC: плита/стол) */
export function pathToItemAdjacent(
  items: PlacedItem[],
  fromX: number,
  fromY: number,
  p: PlacedItem,
  exp: number,
): PathCell[] | null {
  const sx = Math.round(fromX)
  const sy = Math.round(fromY)
  // если стоим на непроходимой клетке (крайние случаи) — ищем ближайшую проходимую
  let start: PathCell = { x: sx, y: sy }
  if (!isWalkable(items, sx, sy, exp)) {
    const near = findNearestWalkable(items, sx, sy, exp)
    if (!near) return null
    start = near
  }
  const adj = adjacentWalkableKeys(items, p, exp)
  if (!adj.size) return null
  const path = findPathToTargets(items, start.x, start.y, adj, exp)
  if (path && (start.x !== sx || start.y !== sy)) path.unshift({ x: sx, y: sy })
  return path
}

/** Ближайшая проходимая клетка (BFS-кольцо, радиус до 3) */
export function findNearestWalkable(
  items: PlacedItem[],
  x: number,
  y: number,
  exp: number,
  maxR = 3,
): PathCell | null {
  for (let r = 0; r <= maxR; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue
        if (isWalkable(items, x + dx, y + dy, exp)) return { x: x + dx, y: y + dy }
      }
    }
  }
  return null
}

/** Путь к двери: до клетки входа + сама дверь (-1,4) за пределами сетки */
export function pathToDoor(items: PlacedItem[], fromX: number, fromY: number, exp: number): PathCell[] | null {
  const sx = Math.round(fromX)
  const sy = Math.round(fromY)
  let start: PathCell = { x: sx, y: sy }
  if (!isWalkable(items, sx, sy, exp)) {
    const near = findNearestWalkable(items, sx, sy, exp)
    if (!near) return null
    start = near
  }
  const path = findPath(items, start.x, start.y, ENTRY.x, ENTRY.y, exp)
  if (!path) return null
  if (start.x !== sx || start.y !== sy) path.unshift({ x: sx, y: sy })
  path.push({ x: -1, y: ENTRY.y }) // сама дверь за сеткой
  return path
}
