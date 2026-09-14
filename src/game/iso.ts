// Изометрическая проекция сцены (design.md §5).
// Diamond-изометрия 2:1, базовый тайл 64×32. Логические клетки остаются
// целыми (x, y) как в симуляции — этот модуль только переводит их в px.
// Логика/экономика не затронуты: добавлены только константы и чистые функции.

import { HALL_W, HALL_H, KITCHEN_W } from './catalog'

export const TILE_W = 64
export const TILE_H = 32
/** Высота задних стен, px */
export const WALL_H = 96
/** Запас снизу под тени/бабблы */
export const PAD_BOTTOM = 24

export const GRID_W = HALL_W + KITCHEN_W // 13
export const GRID_H = HALL_H // 8

/** Поле сцены при k=1 (design.md §5.1): 672×456 */
export const SCENE_W = (GRID_W + GRID_H) * (TILE_W / 2) // 672
export const SCENE_H = WALL_H + (GRID_W + GRID_H) * (TILE_H / 2) + PAD_BOTTOM // 456

/** Смещение origin: центр клетки (0,0) → (ORIGIN_X, WALL_H) */
export const ORIGIN_X = GRID_H * (TILE_W / 2) // 256

/** Центр клетки (x, y) → экранные px внутри сцены (дробные координаты ок) */
export function isoX(x: number, y: number): number {
  return ORIGIN_X + (x - y) * (TILE_W / 2)
}
export function isoY(x: number, y: number): number {
  return WALL_H + (x + y) * (TILE_H / 2)
}

/** Обратная проекция: px внутри сцены → ближайшая клетка сетки */
export function screenToCell(sx: number, sy: number): { x: number; y: number } {
  const u = (sx - ORIGIN_X) / (TILE_W / 2) // = x - y
  const v = (sy - WALL_H) / (TILE_H / 2) // = x + y
  return { x: Math.round((u + v) / 2), y: Math.round((v - u) / 2) }
}

/** Painter's algorithm: z-index = (x + y) × 10 + layer (design.md §5.2) */
export const Z = {
  shadow: 1,
  object: 2,
  character: 3,
  bubble: 5,
} as const

export function zOrder(x: number, y: number, layer: number): number {
  return Math.round((x + y) * 10) + layer
}
