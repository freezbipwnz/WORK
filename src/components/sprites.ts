// Мапа itemId каталога → файл спрайта в public/sprites (без расширения).
// Предметы без спрайта рендерятся эмодзи-фоллбэком.
export const ITEM_SPRITES: Record<string, string> = {
  table_folding: 'table_small',
  table_wooden: 'table_wood',
  table_italian: 'table_italy',
  stove_gas: 'stove',
  cutting_table: 'prep_table',
  fridge: 'fridge',
  pizza_oven: 'pizza_oven',
  ficus: 'plant',
  painting: 'picture',
  floor_lamp: 'lamp',
  aquarium: 'aquarium',
}

export const STAFF_SPRITES: Record<string, string> = {
  cook: 'cook',
  waiter: 'waiter',
  cleaner: 'cleaner',
}

export const CUSTOMER_SPRITES = ['customer_1', 'customer_2', 'customer_3', 'customer_4']

export const DOOR_SPRITE = 'door'

export const CHAIR_SPRITE = 'chair'

// Эмодзи заказа → иконка блюда (только для блюд со спрайтом).
export const DISH_SPRITES: Record<string, string> = {
  '🥗': 'dish_salad',
  '🍝': 'dish_soup',
}

export function spriteUrl(name: string): string {
  // import.meta.env.BASE_URL: '/' локально, '/WORK/' на GitHub Pages
  return `${import.meta.env.BASE_URL}sprites/${name}.png`
}

/** Детерминированный спрайт клиента по его id */
export function customerSprite(clientId: string): string {
  let h = 0
  for (let i = 0; i < clientId.length; i++) h = (h * 31 + clientId.charCodeAt(i)) >>> 0
  return CUSTOMER_SPRITES[h % CUSTOMER_SPRITES.length]
}
