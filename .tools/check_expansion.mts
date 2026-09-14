// Проверка механики «Расширение помещения по уровням» (ТЗ §1.2).
// Запуск: node_modules/.bin/esbuild .tools/check_expansion.mts --bundle --platform=node
//         --format=esm "--define:import.meta.env.BASE_URL=\"/\"" --outfile=.tools/check_expansion.mjs
//         && node .tools/check_expansion.mjs

import {
  EXPANSIONS,
  MAX_EXPANSION,
  HALL_W,
  HALL_H,
  KITCHEN_W,
  hallWAt,
  hallHAt,
  gridWAt,
  gridHAt,
  curbRowAt,
  streetRowsAt,
  facadeZoneAt,
  isFacadeCell,
  getItem,
} from '../src/game/catalog'
import { SCENE_W, SCENE_H, ORIGIN_X, ORIGIN_Y, GRID_W_MAX, GRID_H_MAX, isoX, isoY } from '../src/game/iso'
import {
  gridSizeAt,
  isWalkable,
  findPath,
  doorPathToItem,
  pathToDoor,
  placementKeepsPaths,
  reachableFromEntry,
  ENTRY,
} from '../src/game/pathfinding'
import { canPlace, useGameStore } from '../src/game/store'
import type { PlacedItem } from '../src/game/types'

let failures = 0
function check(name: string, cond: boolean, extra = '') {
  if (cond) {
    console.log(`  ok  ${name}`)
  } else {
    failures++
    console.error(`FAIL  ${name} ${extra}`)
  }
}

// Стартовая расстановка (как initialItems в store.ts) — кухня у базовой границы x=10
const baseItems: PlacedItem[] = [
  { uid: 't1', itemId: 'table_folding', x: 2, y: 2 },
  { uid: 't2', itemId: 'table_folding', x: 6, y: 5 },
  { uid: 'k1', itemId: 'stove_gas', x: HALL_W, y: 2 },
  { uid: 'k2', itemId: 'cutting_table', x: HALL_W + 1, y: 4 },
  { uid: 'k3', itemId: 'fridge', x: HALL_W + 2, y: 5 },
]

console.log('== размеры сетки по уровням расширения ==')
const expected = [
  { gw: 13, gh: 8 },
  { gw: 15, gh: 8 },
  { gw: 17, gh: 8 },
  { gw: 17, gh: 10 },
]
for (let exp = 0; exp <= MAX_EXPANSION; exp++) {
  const { w, h } = gridSizeAt(exp)
  check(`exp=${exp}: gridSize ${w}x${h}`, w === expected[exp].gw && h === expected[exp].gh)
  check(`exp=${exp}: hallWAt/hallHAt`, hallWAt(exp) === expected[exp].gw - KITCHEN_W && hallHAt(exp) === expected[exp].gh)
  check(`exp=${exp}: улица следует за залом`, curbRowAt(exp) === expected[exp].gh + 2 &&
    streetRowsAt(exp)[0] === expected[exp].gh && streetRowsAt(exp)[1] === expected[exp].gh + 1)
  const fz = facadeZoneAt(exp)
  check(`exp=${exp}: фасадная зона y=${fz.y}`, fz.y === expected[exp].gh && isFacadeCell(1, fz.y, exp) && !isFacadeCell(1, fz.y - 1, exp))
}

console.log('== pathfinding на каждом уровне расширения ==')
for (let exp = 0; exp <= MAX_EXPANSION; exp++) {
  const hw = hallWAt(exp)
  const hh = hallHAt(exp)
  // путь от двери до угловой клетки зала
  const toCorner = findPath(baseItems, ENTRY.x, ENTRY.y, hw - 1, hh - 1, exp)
  check(`exp=${exp}: дверь -> угол зала (${hw - 1},${hh - 1})`, !!toCorner && toCorner.length > 0)
  // путь от двери до кухни (первая клетка кухни)
  const toKitchen = findPath(baseItems, ENTRY.x, ENTRY.y, hw, 0, exp)
  check(`exp=${exp}: дверь -> кухня (${hw},0)`, !!toKitchen && toKitchen.length > 0)
  // путь до двери из дальнего угла (уход клиента)
  const back = pathToDoor(baseItems, hw - 1, hh - 1, exp)
  check(`exp=${exp}: угол зала -> дверь`, !!back && back[back.length - 1].x === -1 && back[back.length - 1].y === 4)
  // проходимость новых клеток (x=10, y=0 занята? нет — плита на (10,2))
  if (exp >= 1) {
    check(`exp=${exp}: новые клетки зала проходимы`, isWalkable(baseItems, 10, 0, exp) && isWalkable(baseItems, hw - 1, hh - 1, exp))
  }
  if (exp >= 3) {
    check(`exp=${exp}: новые ряды (y=8,9) проходимы`, isWalkable(baseItems, 5, 8, exp) && isWalkable(baseItems, 5, 9, exp))
  }
  // валидация расстановки: стартовые предметы не ломают проходы
  check(`exp=${exp}: placementKeepsPaths(старт)`, placementKeepsPaths(baseItems, exp))
  // все столы достижимы от двери
  const reach = reachableFromEntry(baseItems, exp)
  check(`exp=${exp}: вход достижим`, reach.has('0,4'))
  const t1 = baseItems[0]
  check(`exp=${exp}: путь дверь->стол (doorPathToItem)`, !!doorPathToItem(baseItems, t1, exp))
}

console.log('== валидация размещения на новых клетках ==')
check('exp=0: стол в x=10 НЕЛЬЗЯ (это кухня)', !canPlace(baseItems, 'table_folding', 10, 0, 0))
check('exp=1: стол в (10,0) МОЖНО (новая колонка)', canPlace(baseItems, 'table_folding', 10, 0, 1))
check('exp=2: стол в (13,0) МОЖНО', canPlace(baseItems, 'table_folding', 13, 0, 2))
check('exp=3: стол в (13,9) МОЖНО (новый ряд)', canPlace(baseItems, 'table_folding', 13, 9, 3))
check('exp=2: стол в (13,0) НЕЛЬЗЯ (граница 14)', !canPlace(baseItems, 'table_folding', 13, 0, 1))
check('exp=0: кухня на своей границе (10,1)', canPlace(baseItems, 'fridge', 10, 1, 0))
check('exp=2: кухня сдвинулась (14,1)', canPlace(baseItems, 'fridge', 14, 1, 2))
check('exp=2: кухня на старой границе (10,1) НЕЛЬЗЯ (это зал)', !canPlace([], 'fridge', 10, 1, 2))
for (let exp = 0; exp <= MAX_EXPANSION; exp++) {
  const fz = facadeZoneAt(exp)
  check(`exp=${exp}: фасадный предмет на зоне улицы`, canPlace([], 'flower_bed', fz.x0, fz.y, exp))
  check(`exp=${exp}: фасадный предмет вне зоны отклонён`, !canPlace([], 'flower_bed', fz.x0, fz.y - 1, exp))
}

console.log('== геометрия сцены (макс. сетка влезает, origin центрирован) ==')
check('SCENE 1120x736 (не меняется при расширении)', SCENE_W === 1120 && SCENE_H === 736)
check('GRID_MAX 17x10', GRID_W_MAX === 17 && GRID_H_MAX === 10)
check('ORIGIN по центру макс. сетки', ORIGIN_X === 448 && ORIGIN_Y === 224)
// крайние точки контента макс. сетки: верх стены и низ пола/тротуара — внутри сцены
check('верх стены макс. сетки ≥ 0', ORIGIN_Y - 96 >= 0, `got ${ORIGIN_Y - 96}`)
const floorBottomMax = ORIGIN_Y + (GRID_W_MAX + GRID_H_MAX) * 8 // нижний вертекс пола (17+10)*16
check('низ пола макс. сетки ≤ SCENE_H', floorBottomMax <= SCENE_H, `got ${floorBottomMax}`)
// ширина пола макс. сетки по центру сцены
check('пол макс. сетки по центру сцены', Math.abs(ORIGIN_X - (SCENE_W / 2 - (GRID_W_MAX - GRID_H_MAX) * 16)) < 0.01)
check('макс. пол в пределах сцены по X', ORIGIN_X - 320 >= 0 && ORIGIN_X + 544 <= SCENE_W)
// тротуар при макс. расширении: самая нижняя клетка обочины (14,12) в сцене
const curbBottom = isoY(14, 12) + 16
check('обочина макс. расширения ≤ SCENE_H', curbBottom <= SCENE_H, `got ${curbBottom}`)
// мебель не съезжает: изо-координаты клеток не зависят от expansion
check('iso фиксирован (клетка 0,0)', isoX(0, 0) === ORIGIN_X && isoY(0, 0) === ORIGIN_Y)

console.log('== покупка расширения через стор ==')
{
  const st = useGameStore.getState()
  // недостаток уровня
  useGameStore.setState({ coins: 100000, level: 4, expansion: 0 })
  check('ур.4: покупка отклонена', useGameStore.getState().buyExpansion() === false && useGameStore.getState().expansion === 0)
  // недостаток монет
  useGameStore.setState({ coins: 100, level: 5, expansion: 0 })
  check('монет мало: покупка отклонена', useGameStore.getState().buyExpansion() === false && useGameStore.getState().expansion === 0)
  // успех
  useGameStore.setState({ coins: 1000, level: 5, expansion: 0 })
  const ok = useGameStore.getState().buyExpansion()
  const after = useGameStore.getState()
  check('покупка exp0->1: списание 800', ok === true && after.expansion === 1 && after.coins === 200)
  check('тост о расширении показан', after.toasts.some((t) => t.text.includes('расширен')))
  useGameStore.setState({ coins: 100000, level: 15 })
  check('покупка exp1->2', useGameStore.getState().buyExpansion() === true && useGameStore.getState().expansion === 2)
  check('покупка exp2->3', useGameStore.getState().buyExpansion() === true && useGameStore.getState().expansion === 3)
  check('за пределом MAX — отказ', useGameStore.getState().buyExpansion() === false && useGameStore.getState().expansion === 3)
  // размещение на новых клетках после покупок (кухня теперь сдвинута вправо, стартовые предметы на местах)
  const items3 = useGameStore.getState().items
  check('после покупок: стол в новом ряду (5,9) можно', canPlace(items3, 'table_folding', 5, 9, 3))
  check('после покупок: плита на кухне (16,0) можно', canPlace(items3, 'stove_gas', 16, 0, 3))
  check('после покупок: плита на (10,2) сейчас в зале — валидация зоны', !canPlace(items3.filter((i) => i.uid !== 'k1'), 'stove_gas', 10, 2, 3))
  void st
}

console.log('== сценарий: стол в новой части зала, клиент доходит ==')
{
  const items: PlacedItem[] = [
    ...baseItems,
    { uid: 'tNew', itemId: 'table_wooden', x: 12, y: 6 }, // 2x2 стол в расширенной зоне
  ]
  const p = doorPathToItem(items, items[items.length - 1], 3)
  check('путь до стола в новой части зала', !!p && p.length > 0)
  check('расстановка с новым столом валидна', placementKeepsPaths(items, 3))
  const def = getItem('table_wooden')
  check('каталог на месте', !!def && def.seats === 4)
}

console.log(failures === 0 ? '\nВСЕ ПРОВЕРКИ ПРОШЛИ' : `\nПРОВАЛОВ: ${failures}`)
process.exit(failures === 0 ? 0 : 1)
