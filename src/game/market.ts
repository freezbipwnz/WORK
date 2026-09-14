// Рынок ингредиентов и рецепты блюд (game.md: экономика чека 8 + 1.5×ур).
// Ингредиенты покупаются за монеты в панели «Рынок», расходуются при startCooking.

/** Ингредиент на рынке */
export interface IngredientDef {
  id: string
  name: string
  emoji: string
  /** Цена за 1 шт, монеты (~15–30% от чека блюда на низких уровнях) */
  price: number
  description: string
}

export const INGREDIENTS: IngredientDef[] = [
  { id: 'dough', name: 'Тесто', emoji: '🥖', price: 3, description: 'Основа пиццы и выпечки.' },
  { id: 'veggies', name: 'Овощи', emoji: '🥬', price: 2, description: 'Свежие, с грядки. Для салата.' },
  { id: 'meat', name: 'Мясо', emoji: '🥩', price: 4, description: 'Мраморная вырезка для стейка.' },
  { id: 'fish', name: 'Рыба', emoji: '🐟', price: 4, description: 'Свежий улов. Для ухи и суши.' },
  { id: 'cheese', name: 'Сыр', emoji: '🧀', price: 3, description: 'Тянется, плавится, пахнет.' },
  { id: 'spices', name: 'Специи', emoji: '🌶️', price: 2, description: 'Щепотка востока в каждом блюде.' },
]

export function getIngredient(id: string): IngredientDef | undefined {
  return INGREDIENTS.find((i) => i.id === id)
}

/** Состав блюда: ingredientId → кол-во */
export type Recipe = Record<string, number>

/** Рецепт блюда. emoji — то, что видит клиент в баббле заказа (Client.order). */
export interface DishDef {
  id: string
  name: string
  /** Эмодзи заказа (совместим с Client.order и DISH_SPRITES) */
  emoji: string
  /** Уровень открытия */
  level: number
  /** Состав: пустой = «домашнее блюдо», готовится без ингредиентов */
  recipe: Recipe
  description: string
}

export const DISHES: DishDef[] = [
  {
    id: 'soup',
    name: 'Домашний суп',
    emoji: '🍝',
    level: 1,
    recipe: {}, // домашнее блюдо: всегда можно приготовить
    description: 'Бабушкин рецепт. Готовится из того, что было.',
  },
  {
    id: 'salad',
    name: 'Салат',
    emoji: '🥗',
    level: 1,
    recipe: { veggies: 1 },
    description: 'Лёгкий и хрустящий.',
  },
  {
    id: 'drink',
    name: 'Лимонад',
    emoji: '🍹',
    level: 2,
    recipe: { spices: 1 },
    description: 'Освежает даже в час пик.',
  },
  {
    id: 'pizza',
    name: 'Пицца',
    emoji: '🍕',
    level: 4,
    recipe: { dough: 1, cheese: 1 },
    description: 'Хрустящая корочка, тянущийся сыр.',
  },
  {
    id: 'steak',
    name: 'Стейк',
    emoji: '🥩',
    level: 6,
    recipe: { meat: 1, spices: 1 },
    description: 'Прожарка medium rare. Для гурманов.',
  },
  {
    id: 'ukha',
    name: 'Уха',
    emoji: '🍲',
    level: 7,
    recipe: { fish: 1, veggies: 1 },
    description: 'Наваристая, из свежего улова. С зеленью.',
  },
  {
    id: 'sushi',
    name: 'Суши',
    emoji: '🍣',
    level: 8,
    recipe: { fish: 2 },
    description: 'Нигири с лососем и тунцом. Искусство минимализма.',
  },
  {
    id: 'burger',
    name: 'Бургер',
    emoji: '🍔',
    level: 10,
    recipe: { dough: 1, meat: 1 },
    description: 'Сочная котлета, тёплая булка. Классика фастфуда.',
  },
  {
    id: 'cake',
    name: 'Торт',
    emoji: '🍰',
    level: 12,
    recipe: { dough: 2, cheese: 1 },
    description: 'Нежные коржи и крем. Финал идеального ужина.',
  },
]

export function getDishByEmoji(emoji: string): DishDef | undefined {
  return DISHES.find((d) => d.emoji === emoji)
}

/** Стартовый запас: по 5 каждого ингредиента */
export function initialInventory(): Record<string, number> {
  const inv: Record<string, number> = {}
  for (const i of INGREDIENTS) inv[i.id] = 5
  return inv
}

/** Хватает ли ингредиентов на рецепт */
export function hasIngredients(inv: Record<string, number>, recipe: Recipe): boolean {
  return Object.entries(recipe).every(([id, n]) => (inv[id] ?? 0) >= n)
}

/** Блюда, доступные по уровню */
export function unlockedDishes(level: number): DishDef[] {
  return DISHES.filter((d) => d.level <= level)
}

/**
 * Эмодзи заказа для нового клиента: из блюд, открытых по уровню И
 * приготовимых из текущих запасов. «Домашний суп» (пустой состав) —
 * всегда в списке, чтобы клиенты не оставались без заказа.
 */
export function pickOrderEmoji(inv: Record<string, number>, level: number): string {
  const cookable = unlockedDishes(level).filter((d) => hasIngredients(inv, d.recipe))
  const pool = cookable.length ? cookable : DISHES.filter((d) => Object.keys(d.recipe).length === 0)
  return pool[Math.floor(Math.random() * pool.length)].emoji
}
