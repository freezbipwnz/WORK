// Сюжетная линейка квестов прогрессии (~50 шт, уровни 1–10+).
// Прогресс считается по счётчикам GameStats (store.syncQuests), награды — через claimQuest.
// unlockLevel — уровень, с которого квест виден как активный; до этого он «заблокирован».

import type { GameStats, Quest } from './types'

export interface StoryQuestDef {
  id: string
  title: string
  description: string
  stat: keyof GameStats
  target: number
  unlockLevel: number
  reward: number
  xpReward: number
  gemReward?: number
}

/** Шаблон сюжетных квестов: id стабильны (старые сейвы мержатся по id) */
export const STORY_QUEST_DEFS: StoryQuestDef[] = [
  // ---------- Уровень 1: первые шаги ----------
  { id: 'first_guest', title: 'Первый гость', description: 'Обслужи 1 клиента', stat: 'servedClients', target: 1, unlockLevel: 1, reward: 100, xpReward: 50 },
  { id: 'cook_3', title: 'Проба плиты', description: 'Приготовь 3 блюда', stat: 'dishesCooked', target: 3, unlockLevel: 1, reward: 80, xpReward: 40 },
  { id: 'earn_100', title: 'Первая выручка', description: 'Заработай 100🪙 с клиентов', stat: 'coinsEarned', target: 100, unlockLevel: 1, reward: 100, xpReward: 50 },
  { id: 'second_table', title: 'Второй стол', description: 'Купи стол', stat: 'tablesBought', target: 1, unlockLevel: 1, reward: 150, xpReward: 60 },
  { id: 'serve_5', title: 'Пятеро за день', description: 'Обслужи 5 клиентов', stat: 'servedClients', target: 5, unlockLevel: 1, reward: 150, xpReward: 70 },
  { id: 'cozy', title: 'Уютнее некуда', description: 'Размести 3 предмета декора', stat: 'decorPlaced', target: 3, unlockLevel: 1, reward: 300, xpReward: 150 },

  // ---------- Уровень 2: раскачка ----------
  { id: 'earn_300', title: 'Касса растёт', description: 'Заработай 300🪙 с клиентов', stat: 'coinsEarned', target: 300, unlockLevel: 2, reward: 180, xpReward: 80 },
  { id: 'happy_faces', title: 'Довольные лица', description: 'Получи 5 хороших отзывов', stat: 'goodReviews', target: 5, unlockLevel: 2, reward: 200, xpReward: 100 },
  { id: 'team', title: 'Команда', description: 'Найми повара', stat: 'cooksHired', target: 1, unlockLevel: 2, reward: 250, xpReward: 120 },
  { id: 'shop_3', title: 'Обстановка', description: 'Купи 3 предмета в магазине', stat: 'itemsBought', target: 3, unlockLevel: 2, reward: 150, xpReward: 70 },
  { id: 'serve_10', title: 'Десятка!', description: 'Обслужи 10 клиентов', stat: 'servedClients', target: 10, unlockLevel: 2, reward: 200, xpReward: 90 },
  { id: 'market_5', title: 'Первая закупка', description: 'Купи 5 ингредиентов на рынке', stat: 'ingredientsBought', target: 5, unlockLevel: 2, reward: 120, xpReward: 60 },

  // ---------- Уровень 3: VIP и фасад ----------
  { id: 'first_vip', title: 'Первый VIP', description: 'Обслужи VIP-клиента 👑 (без разворота)', stat: 'vipServed', target: 1, unlockLevel: 3, reward: 300, xpReward: 150, gemReward: 5 },
  { id: 'facade_1', title: 'Лицо ресторана', description: 'Поставь предмет фасада (клумба, вывеска)', stat: 'facadePlaced', target: 1, unlockLevel: 3, reward: 200, xpReward: 90 },
  { id: 'cook_15', title: 'Кухня дымится', description: 'Приготовь 15 блюд', stat: 'dishesCooked', target: 15, unlockLevel: 3, reward: 250, xpReward: 110 },
  { id: 'seats_6', title: 'Больше мест!', description: 'Добейся 6 посадочных мест', stat: 'seatsMax', target: 6, unlockLevel: 3, reward: 250, xpReward: 100 },
  { id: 'earn_700', title: 'Стабильный доход', description: 'Заработай 700🪙 с клиентов', stat: 'coinsEarned', target: 700, unlockLevel: 3, reward: 300, xpReward: 130 },
  { id: 'clean_5', title: 'Тап по грязи', description: 'Убери 5 пятен грязи', stat: 'stainsCleaned', target: 5, unlockLevel: 3, reward: 200, xpReward: 80 },
  { id: 'delivery_3', title: 'Первые доставки', description: 'Собери 3 доставки 🛵', stat: 'deliveriesDone', target: 3, unlockLevel: 3, reward: 250, xpReward: 120 },

  // ---------- Уровень 4: сервис ----------
  { id: 'waiter_1', title: 'Руки свободны', description: 'Найми официанта 🤵', stat: 'waitersHired', target: 1, unlockLevel: 4, reward: 350, xpReward: 160 },
  { id: 'serve_25', title: 'Четверть сотни', description: 'Обслужи 25 клиентов', stat: 'servedClients', target: 25, unlockLevel: 4, reward: 350, xpReward: 150 },
  { id: 'atmo_5', title: 'Атмосфера 5%', description: 'Достигни 5% атмосферы (декор)', stat: 'maxAtmosphere', target: 5, unlockLevel: 4, reward: 300, xpReward: 140 },
  { id: 'market_15', title: 'Запасливый', description: 'Купи 15 ингредиентов на рынке', stat: 'ingredientsBought', target: 15, unlockLevel: 4, reward: 250, xpReward: 100 },
  { id: 'earn_1500', title: 'Полторы тысячи', description: 'Заработай 1500🪙 с клиентов', stat: 'coinsEarned', target: 1500, unlockLevel: 4, reward: 400, xpReward: 180 },

  // ---------- Уровень 5: рост ----------
  { id: 'serve_40', title: 'Поток гостей', description: 'Обслужи 40 клиентов', stat: 'servedClients', target: 40, unlockLevel: 5, reward: 450, xpReward: 200 },
  { id: 'happy_20', title: 'Любимчик публики', description: 'Получи 20 хороших отзывов', stat: 'goodReviews', target: 20, unlockLevel: 5, reward: 400, xpReward: 190 },
  { id: 'stove_2', title: 'Вторая конфорка', description: 'Купи плиту (апгрейд кухни)', stat: 'stovesBought', target: 1, unlockLevel: 5, reward: 400, xpReward: 180 },
  { id: 'seats_10', title: 'Просторный зал', description: 'Добейся 10 посадочных мест', stat: 'seatsMax', target: 10, unlockLevel: 5, reward: 450, xpReward: 200 },
  { id: 'level_5', title: 'Крепкий середняк', description: 'Достигни 5 уровня', stat: 'levelReached', target: 5, unlockLevel: 5, reward: 300, xpReward: 100, gemReward: 5 },
  { id: 'cleanliness', title: 'Чистота — залог...', description: 'Убери 10 пятен грязи', stat: 'stainsCleaned', target: 10, unlockLevel: 5, reward: 250, xpReward: 80 },
  { id: 'tips_500', title: 'Щедрые гости', description: 'Получи 500🪙 чаевых', stat: 'tipsEarned', target: 500, unlockLevel: 5, reward: 400, xpReward: 180 },
  { id: 'critic_1', title: 'Слухи о критике', description: 'Обслужи анонимного критика 📝 (не дай ему уйти злым)', stat: 'criticsServed', target: 1, unlockLevel: 5, reward: 400, xpReward: 180, gemReward: 5 },

  // ---------- Уровень 6: престиж ----------
  { id: 'vip_3', title: 'VIP-сервис', description: 'Обслужи 3 VIP-клиентов 👑', stat: 'vipServed', target: 3, unlockLevel: 6, reward: 500, xpReward: 220, gemReward: 5 },
  { id: 'decor_6', title: 'Дизайнер интерьеров', description: 'Размести 6 предметов декора', stat: 'decorPlaced', target: 6, unlockLevel: 6, reward: 400, xpReward: 180 },
  { id: 'cook_40', title: 'Шеф от бога', description: 'Приготовь 40 блюд', stat: 'dishesCooked', target: 40, unlockLevel: 6, reward: 450, xpReward: 200 },
  { id: 'earn_3000', title: 'Три тысячи', description: 'Заработай 3000🪙 с клиентов', stat: 'coinsEarned', target: 3000, unlockLevel: 6, reward: 550, xpReward: 240 },
  { id: 'facade_2', title: 'Заметный с улицы', description: 'Поставь 2 предмета фасада', stat: 'facadePlaced', target: 2, unlockLevel: 6, reward: 350, xpReward: 160 },
  { id: 'groups_5', title: 'Компания за столом', description: 'Обслужи 5 групп гостей', stat: 'groupsServed', target: 5, unlockLevel: 6, reward: 500, xpReward: 220 },

  // ---------- Уровень 7: порядок ----------
  { id: 'cleaner_1', title: 'Чистые руки', description: 'Найми уборщика 🧹', stat: 'cleanersHired', target: 1, unlockLevel: 7, reward: 500, xpReward: 220 },
  { id: 'serve_60', title: 'Шесть десятков', description: 'Обслужи 60 клиентов', stat: 'servedClients', target: 60, unlockLevel: 7, reward: 600, xpReward: 260 },
  { id: 'clean_15', title: 'Сияющий зал', description: 'Убери 15 пятен грязи', stat: 'stainsCleaned', target: 15, unlockLevel: 7, reward: 400, xpReward: 170 },
  { id: 'atmo_12', title: 'Атмосфера 12%', description: 'Достигни 12% атмосферы', stat: 'maxAtmosphere', target: 12, unlockLevel: 7, reward: 500, xpReward: 220 },
  { id: 'market_30', title: 'Оптовик', description: 'Купи 30 ингредиентов на рынке', stat: 'ingredientsBought', target: 30, unlockLevel: 7, reward: 400, xpReward: 170 },
  { id: 'delivery_10', title: 'Курьерская сеть', description: 'Собери 10 доставок 🛵', stat: 'deliveriesDone', target: 10, unlockLevel: 7, reward: 600, xpReward: 260 },
  { id: 'birthday_3', title: 'Праздник к нам приходит', description: 'Проведи 3 дня рождения 🎂', stat: 'birthdaysHosted', target: 3, unlockLevel: 7, reward: 600, xpReward: 260 },

  // ---------- Уровень 8: серьёзная кухня ----------
  { id: 'kitchen_up', title: 'Мощная кухня', description: 'Купи 2 плиты (вторая точка готовки)', stat: 'stovesBought', target: 2, unlockLevel: 8, reward: 700, xpReward: 300, gemReward: 5 },
  { id: 'vip_5', title: 'Золотые гости', description: 'Обслужи 5 VIP-клиентов 👑', stat: 'vipServed', target: 5, unlockLevel: 8, reward: 700, xpReward: 300 },
  { id: 'earn_5000', title: 'Пять тысяч', description: 'Заработай 5000🪙 с клиентов', stat: 'coinsEarned', target: 5000, unlockLevel: 8, reward: 800, xpReward: 340 },
  { id: 'serve_85', title: 'Почти сотня', description: 'Обслужи 85 клиентов', stat: 'servedClients', target: 85, unlockLevel: 8, reward: 800, xpReward: 340 },
  { id: 'inspection_3', title: 'Безупречная чистота', description: 'Пройди 3 санинспекции 🧾', stat: 'inspectionsPassed', target: 3, unlockLevel: 8, reward: 700, xpReward: 300 },

  // ---------- Уровень 9: империя ----------
  { id: 'staff_3', title: 'Полный штат', description: 'Найми 3 сотрудников', stat: 'staffHired', target: 3, unlockLevel: 9, reward: 700, xpReward: 300, gemReward: 5 },
  { id: 'decor_10', title: 'Музей уюта', description: 'Размести 10 предметов декора', stat: 'decorPlaced', target: 10, unlockLevel: 9, reward: 700, xpReward: 300 },
  { id: 'seats_14', title: 'Банкетный зал', description: 'Добейся 14 посадочных мест', stat: 'seatsMax', target: 14, unlockLevel: 9, reward: 800, xpReward: 320 },
  { id: 'happy_45', title: 'Легенда района', description: 'Получи 45 хороших отзывов', stat: 'goodReviews', target: 45, unlockLevel: 9, reward: 800, xpReward: 330 },
  { id: 'groups_15', title: 'Банкетный менеджер', description: 'Обслужи 15 групп гостей', stat: 'groupsServed', target: 15, unlockLevel: 9, reward: 800, xpReward: 340 },

  // ---------- Уровень 10: вершина ----------
  { id: 'level_10', title: 'Десятый уровень!', description: 'Достигни 10 уровня', stat: 'levelReached', target: 10, unlockLevel: 10, reward: 1000, xpReward: 400, gemReward: 10 },
  { id: 'earn_8000', title: 'Восемь тысяч', description: 'Заработай 8000🪙 с клиентов', stat: 'coinsEarned', target: 8000, unlockLevel: 10, reward: 1000, xpReward: 420 },
  { id: 'vip_10', title: 'Свой человек у элиты', description: 'Обслужи 10 VIP-клиентов 👑', stat: 'vipServed', target: 10, unlockLevel: 10, reward: 1000, xpReward: 400, gemReward: 10 },
  { id: 'serve_120', title: 'Сто двадцать гостей', description: 'Обслужи 120 клиентов', stat: 'servedClients', target: 120, unlockLevel: 10, reward: 1200, xpReward: 500, gemReward: 10 },
]

/** Свежий список сюжетных квестов (progress 0, не забраны) */
export function buildStoryQuests(): Quest[] {
  return STORY_QUEST_DEFS.map((d) => ({
    id: d.id,
    title: d.title,
    description: d.description,
    target: d.target,
    progress: 0,
    reward: d.reward,
    xpReward: d.xpReward,
    gemReward: d.gemReward,
    stat: d.stat,
    unlockLevel: d.unlockLevel,
    claimed: false,
  }))
}

/**
 * Миграция сейва: мержит сохранённые сюжетные квесты с актуальным шаблоном.
 * Сохраняем claimed/progress по id (старые квесты не слетают), новые добавляются.
 */
export function mergeStoryQuests(saved: Quest[] | undefined): Quest[] {
  const byId = new Map((saved ?? []).map((q) => [q.id, q]))
  return STORY_QUEST_DEFS.map((d) => {
    const old = byId.get(d.id)
    return {
      id: d.id,
      title: d.title,
      description: d.description,
      target: d.target,
      progress: old?.progress ?? 0,
      reward: d.reward,
      xpReward: d.xpReward,
      gemReward: d.gemReward,
      stat: d.stat,
      unlockLevel: d.unlockLevel,
      claimed: old?.claimed ?? false,
    }
  })
}
