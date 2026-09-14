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

// --- Сетка: сцена изначально размера МАКСИМАЛЬНОГО расширения ---
// Вьюпорт (GameScreen) вписывает сцену целиком (fit-to-view), поэтому размер
// на лету не пересчитывается: при покупке расширения зал просто занимает
// больше места на той же сцене. Максимальная сетка: база 13×8 + 4 колонки
// и 2 ряда расширений (ТЗ §1.2) = 17×10.
export const GRID_W_MAX = HALL_W + KITCHEN_W + 4 // 17
export const GRID_H_MAX = HALL_H + 2 // 10

// --- Расширенное окно видимости мира ---
// Сцена увеличена ~1.65× (было 672×456): вокруг ресторана видны город,
// продолжение дороги и газоны. Мировые координаты НЕ меняются — проекция
// просто смещена (origin) и добавлены поля вокруг старого фрейма.
/** Поля вокруг старого фрейма 672×456, px */
export const PAD_LEFT = 224
export const PAD_TOP = 128
export const PAD_RIGHT = 224
export const PAD_EXTRA_BOTTOM = 152

/** Поле сцены при k=1: 1120×736 — размер максимального расширения (не меняется) */
export const SCENE_W = (HALL_W + KITCHEN_W + HALL_H) * (TILE_W / 2) + PAD_LEFT + PAD_RIGHT // 1120
export const SCENE_H = WALL_H + (HALL_W + KITCHEN_W + HALL_H) * (TILE_H / 2) + PAD_BOTTOM + PAD_TOP + PAD_EXTRA_BOTTOM // 736

/**
 * Смещение origin: центр клетки (0,0) → (ORIGIN_X, ORIGIN_Y).
 * Origin строго по центру МАКСИМАЛЬНОЙ сетки: мебель и стены строятся от своего
 * реального (0,0), поэтому при покупке расширения НИЧЕГО не съезжает — новые
 * клетки прирастают справа и снизу, ресторан остаётся на месте сцены.
 */
export const ORIGIN_X = Math.round(SCENE_W / 2 - ((GRID_W_MAX - GRID_H_MAX) * TILE_W) / 4) // 448
export const ORIGIN_Y = WALL_H + PAD_TOP // 224

/** Центр клетки (x, y) → экранные px внутри сцены (дробные координаты ок) */
export function isoX(x: number, y: number): number {
  return ORIGIN_X + (x - y) * (TILE_W / 2)
}
export function isoY(x: number, y: number): number {
  return ORIGIN_Y + (x + y) * (TILE_H / 2)
}

/** Обратная проекция: px внутри сцены → ближайшая клетка сетки */
export function screenToCell(sx: number, sy: number): { x: number; y: number } {
  const u = (sx - ORIGIN_X) / (TILE_W / 2) // = x - y
  const v = (sy - ORIGIN_Y) / (TILE_H / 2) // = x + y
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
