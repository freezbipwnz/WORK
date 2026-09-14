// Проверка механик событий гостей (ТЗ RestoCity_FULL, раздел гостей/событий):
//   критик (спавн/отзыв/эффект), день рождения, санинспекция,
//   кулинарный фестиваль (неделя/порции/тиры), сезонность, фикс продажи гем-эксклюзивов.
// Запуск: node_modules/.bin/esbuild .tools/check_events.mts --bundle --platform=node
//         --format=esm "--define:import.meta.env.BASE_URL=\"/\"" --outfile=.tools/check_events.mjs
//         && node .tools/check_events.mjs

import { useGameStore, initialStats } from '../src/game/store'
import { currentSeason, isSeasonActive, getItem, mskDateKey } from '../src/game/catalog'
import {
  criticStarsFor,
  criticReviewMult,
  forceNextInspectionAt,
} from '../src/game/simulation'
import {
  FESTIVAL_TARGET,
  FESTIVAL_TIERS,
  festivalWeekKey,
  festivalDishEmoji,
  festivalDish,
  freshFestival,
  normalizeFestival,
} from '../src/game/festival'
import { DISHES } from '../src/game/market'
import { STORY_QUEST_DEFS } from '../src/game/quests'
import type { Client, GameStats, KitchenJob } from '../src/game/types'

let failures = 0
function check(name: string, cond: boolean, extra = '') {
  if (cond) {
    console.log(`  ok  ${name}`)
  } else {
    failures++
    console.error(`FAIL  ${name} ${extra}`)
  }
}

// ---------- сезонность ----------
console.log('== сезонность (по месяцу мск) ==')
{
  const monthSeason: [number, string][] = [
    [0, 'winter'], [1, 'winter'], [2, 'spring'], [3, 'spring'], [4, 'spring'],
    [5, 'summer'], [6, 'summer'], [7, 'summer'], [8, 'autumn'], [9, 'autumn'],
    [10, 'autumn'], [11, 'winter'],
  ]
  for (const [jsMonth, season] of monthSeason) {
    // полдень UTC 15-го числа месяца → в мск тот же месяц
    const now = Date.UTC(2026, jsMonth, 15, 12)
    check(`месяц ${jsMonth + 1} → ${season}`, currentSeason(now) === season, `got ${currentSeason(now)}`)
  }
  check('ёлка — зимний предмет', isSeasonActive(getItem('christmas_tree')!, Date.UTC(2026, 0, 15, 12)))
  check('ёлка скрыта летом', !isSeasonActive(getItem('christmas_tree')!, Date.UTC(2026, 6, 15, 12)))
  check('веранда-зонтик — летний', isSeasonActive(getItem('veranda_umbrella')!, Date.UTC(2026, 6, 15, 12)))
  check('веранда скрыта зимой', !isSeasonActive(getItem('veranda_umbrella')!, Date.UTC(2026, 0, 15, 12)))
  check('обычный предмет без сезона — всегда активен', isSeasonActive(getItem('ficus')!, Date.UTC(2026, 6, 15, 12)))
}

// ---------- оценка критика ----------
console.log('== оценка отзыва критика ==')
check('злой уход — строго 1★', criticStarsFor({ angry: true, patienceRatio: 1, activeStains: 0, atmosphere: 50 }) === 1)
check('идеал: терпение 1.0, 0 пятен, атмо 25 — 5★',
  criticStarsFor({ angry: false, patienceRatio: 1, activeStains: 0, atmosphere: 25 }) === 5)
check('подавно долго, 3 пятна, атмо 10 — 1★',
  criticStarsFor({ angry: false, patienceRatio: 0.05, activeStains: 3, atmosphere: 5 }) === 1)
check('середина: 0.3 терпения, 2 пятна, атмо 15 — 2★',
  criticStarsFor({ angry: false, patienceRatio: 0.3, activeStains: 2, atmosphere: 15 }) === 2)
check('норм: 0.5 терпения, 1 пятно, атмо 10 — 4★',
  criticStarsFor({ angry: false, patienceRatio: 0.5, activeStains: 1, atmosphere: 10 }) === 4)
check('мультипликаторы: 5★→1.25, 4★→1.1, 3★→1, 2★→0.9, 1★→0.8',
  criticReviewMult(5) === 1.25 && criticReviewMult(4) === 1.1 && criticReviewMult(3) === 1 &&
  criticReviewMult(2) === 0.9 && criticReviewMult(1) === 0.8)

// ---------- фестиваль: неделя и блюдо ----------
console.log('== фестиваль: ключ недели, блюдо, миграция ==')
{
  const w1 = festivalWeekKey(Date.UTC(2026, 0, 5, 12)) // понедельник
  const w2 = festivalWeekKey(Date.UTC(2026, 0, 11, 12)) // воскресенье — та же неделя
  check('внутри недели ключ одинаковый', w1 === w2, `${w1} vs ${w2}`)
  const w3 = festivalWeekKey(Date.UTC(2026, 0, 12, 12)) // следующий понедельник
  check('смена недели меняет ключ', w1 !== w3)
  const d1 = festivalDishEmoji(w1)
  check('блюдо недели из DISHES и детерминировано', DISHES.some((d) => d.emoji === d1) && d1 === festivalDishEmoji(w1))
  const old = { weekKey: '2000-W01', portions: 80, claimedTiers: [0, 1, 2] as number[] }
  const norm = normalizeFestival(old)
  check('чужая неделя в сейве — сброс прогресса', norm.weekKey === festivalWeekKey() && norm.portions === 0 && norm.claimedTiers.length === 0)
  const cur = freshFestival()
  const norm2 = normalizeFestival({ ...cur, portions: 42, claimedTiers: [0] })
  check('текущая неделя сохраняется', norm2.weekKey === cur.weekKey && norm2.portions === 42 && norm2.claimedTiers.length === 1)
  check('битые данные → свежий фестиваль', normalizeFestival(null).weekKey === cur.weekKey)
  check('4 тира наград', FESTIVAL_TIERS.length === 4 && FESTIVAL_TIERS[3].portions === FESTIVAL_TARGET)
}

// ---------- стор: фестиваль (порции, тиры, смена недели) ----------
console.log('== фестиваль через стор ==')
{
  const st = useGameStore.getState()
  useGameStore.setState({
    coins: 1000, gems: 0,
    festival: { weekKey: festivalWeekKey(), portions: FESTIVAL_TARGET, claimedTiers: [] },
  })
  check('тир без порогов недоступен: claim(0) с 100 порциями — ок', useGameStore.getState().claimFestivalReward(0) === true)
  check('повторный claim того же тира — отказ', useGameStore.getState().claimFestivalReward(0) === false)
  const coinsAfter1 = useGameStore.getState().coins
  check('тир 1: +200🪙', coinsAfter1 === 1200, `got ${coinsAfter1}`)
  check('тиры 2–4: суммарно +4200🪙 +30💎',
    useGameStore.getState().claimFestivalReward(1) &&
    useGameStore.getState().claimFestivalReward(2) &&
    useGameStore.getState().claimFestivalReward(3) &&
    useGameStore.getState().coins === 1200 + 500 + 1000 + 2500 &&
    useGameStore.getState().gems === 30)
  // смена недели через syncFestivalWeek
  useGameStore.setState({ festival: { weekKey: '2000-W01', portions: 77, claimedTiers: [0] } })
  useGameStore.getState().syncFestivalWeek()
  const fest = useGameStore.getState().festival
  check('syncFestivalWeek сбрасывает на новую неделю', fest.weekKey === festivalWeekKey() && fest.portions === 0 && fest.claimedTiers.length === 0)
  check('тост о новом фестивале', useGameStore.getState().toasts.some((t) => t.text.includes('фестиваль')))
  void st
}

// ---------- порции фестиваля в startCooking ----------
console.log('== порции фестиваля за готовку ==')
{
  const s = useGameStore.getState()
  const festEmoji = festivalDishEmoji(s.festival.weekKey)
  useGameStore.setState({
    level: 12, clients: [], kitchenJobs: [],
    festival: { weekKey: festivalWeekKey(), portions: 0, claimedTiers: [] },
    inventory: { dough: 99, veggies: 99, meat: 99, fish: 99, cheese: 99, spices: 99 },
  })
  // обычное блюдо: +1
  const c1: Client = {
    id: 'fc1', x: 0, y: 0, tx: 0, ty: 0, phase: 'seated',
    order: festEmoji === '🍝' ? '🥗' : '🍝', // гарантированно НЕ фестивальное
    patience: 60, patienceMax: 60, bodyColor: '#fff', face: '🧑', seatedAt: 1,
  }
  useGameStore.setState({ clients: [c1] })
  useGameStore.getState().startCooking('fc1', Date.now(), s.stoveUids()[0])
  check('обычное блюдо: +1 порция', useGameStore.getState().festival.portions === 1, `got ${useGameStore.getState().festival.portions}`)
  // фестивальное блюдо: +3 (плита предыдущей готовки освобождаем)
  const c2: Client = {
    id: 'fc2', x: 0, y: 0, tx: 0, ty: 0, phase: 'seated',
    order: festEmoji, patience: 60, patienceMax: 60, bodyColor: '#fff', face: '🧑', seatedAt: 2,
  }
  useGameStore.setState({ clients: [c2], kitchenJobs: [] })
  useGameStore.getState().startCooking('fc2', Date.now(), s.stoveUids()[0])
  check('фестивальное блюдо: +3 порции', useGameStore.getState().festival.portions === 4, `got ${useGameStore.getState().festival.portions}`)
  check('dishesCooked тоже растёт', useGameStore.getState().stats.dishesCooked >= 2)
}

// ---------- спавн критика и дня рождения ----------
console.log('== спавн: критик ~3% (с 4 ур.), день рождения у групп ==')
{
  useGameStore.setState({ level: 4, clients: [], kitchenJobs: [], stains: [] })
  let critics = 0
  let spawns = 0
  for (let i = 0; i < 400; i++) {
    useGameStore.setState({ clients: [] })
    useGameStore.getState().spawnClient(Date.now())
    const cs = useGameStore.getState().clients
    if (cs.length) spawns++
    if (cs.some((c) => c.guestKind === 'critic')) {
      critics++
      check('критик — анонимный: без vip и 👑-флага', cs.every((c) => !c.vip))
    }
  }
  check('критик спавнится (400 попыток)', critics > 0, `got ${critics}`)
  check('критик редкий (<10% спавнов)', critics < spawns * 0.1, `got ${critics}/${spawns}`)

  useGameStore.setState({ level: 10, clients: [], kitchenJobs: [] })
  let parties = 0
  let birthdays = 0
  for (let i = 0; i < 600; i++) {
    useGameStore.setState({ clients: [] })
    useGameStore.getState().spawnClient(Date.now())
    const cs = useGameStore.getState().clients
    const leader = cs.find((c) => c.partyId === c.id)
    if (leader) {
      parties++
      if (leader.guestKind === 'birthday') birthdays++
    }
  }
  check('группы спавнятся', parties > 50, `got ${parties}`)
  check('день рождения ~8% групп (0..25%)', birthdays > 0 && birthdays <= parties * 0.25, `got ${birthdays}/${parties}`)

  useGameStore.setState({ level: 1, clients: [], kitchenJobs: [] })
  let early = 0
  for (let i = 0; i < 100; i++) {
    useGameStore.setState({ clients: [] })
    useGameStore.getState().spawnClient(Date.now())
    if (useGameStore.getState().clients.some((c) => c.guestKind === 'critic')) early++
  }
  check('критик не приходит до 4 ур. (день рождения у групп — с любого)', early === 0, `got ${early}`)
}

// ---------- подача: день рождения (чек ×1.5, чаевые ×1.5, подарок) ----------
console.log('== день рождения: экономика подачи ==')
{
  const mkLeader = (birthday: boolean): Client => ({
    id: 'bl', x: 2, y: 2, tx: 2, ty: 2, phase: 'seated',
    order: '🍝', patience: 60, patienceMax: 60, bodyColor: '#fff', face: '🧑',
    tableUid: 't1', seatedAt: 1, partyId: 'bl', partySize: 2,
    guestKind: birthday ? 'birthday' : undefined,
  })
  const serveOnce = (birthday: boolean, stub: number) => {
    const realRandom = Math.random
    Math.random = () => stub // tipAmount: (0.8+0.4r); birthdayGem: stub>0.25 → без гема
    useGameStore.setState({
      level: 10, coins: 0, gems: 0, clients: [mkLeader(birthday)],
      kitchenJobs: [], reputation: 0, stats: { ...initialStats() },
      items: [
        { uid: 't1', itemId: 'table_folding', x: 2, y: 2 },
        { uid: 'k1', itemId: 'stove_gas', x: 10, y: 2 },
      ],
      stains: [], rushActive: false,
    })
    const job: KitchenJob = {
      id: 'jb1', clientId: 'bl', stoveUid: 'k1', startedAt: Date.now() - 60_000,
      duration: 6, ready: true, readyAt: Date.now() - 30_000,
    }
    useGameStore.setState({ kitchenJobs: [job] })
    useGameStore.getState().serveDish('jb1', Date.now())
    const out = { ...useGameStore.getState() }
    Math.random = realRandom
    return out
  }
  const plain = serveOnce(false, 0.5)
  const party = serveOnce(true, 0.5)
  // check = (8+1.5*10) * 0.9 = 20.7; tip = 20.7 * (0.05+0.15*atmo/50) * 1.0, atmo=0 → round(1.035)=1
  const expectedCheck = (8 + 1.5 * 10) * 0.9
  const expectedTip = Math.round(expectedCheck * 0.05)
  check('обычная группа: чек+чаевые (atmo 0, не идеально)', plain.coins === Math.round(expectedCheck + expectedTip), `got ${plain.coins} want ${Math.round(expectedCheck + expectedTip)}`)
  // чаевые — % от чека, а чек праздника уже ×1.5: tip = round(31.05×0.05×1.0) = 2 → ×1.5 → 3
  const expectedPartyCheck = expectedCheck * 1.5
  const expectedPartyTip = Math.round(Math.round(expectedPartyCheck * 0.05) * 1.5)
  const expectedParty = Math.round(expectedPartyCheck + expectedPartyTip)
  check('праздник: чек ×1.5 и чаевые ×1.5', party.coins === expectedParty, `got ${party.coins} want ${expectedParty}`)
  check('праздник приносит больше', party.coins > plain.coins)
  check('birthdaysHosted инкремент', party.stats.birthdaysHosted === 1 && plain.stats.birthdaysHosted === 0)
}

// ---------- полный цикл критика: обслужен → 5★, отзыв, эффект, квест ----------
console.log('== критик: обслужен → отзыв 5★ и счётчики ==')
{
  const now = Date.now()
  const items = [
    { uid: 't1', itemId: 'table_folding', x: 2, y: 2 },
    { uid: 'k1', itemId: 'stove_gas', x: 10, y: 2 },
    { uid: 'k2', itemId: 'cutting_table', x: 11, y: 4 },
    { uid: 'k3', itemId: 'fridge', x: 12, y: 5 },
    { uid: 'd1', itemId: 'grand_piano', x: 0, y: 0 },
    { uid: 'd2', itemId: 'grand_piano', x: 1, y: 0 },
    { uid: 'd3', itemId: 'grand_piano', x: 0, y: 1 },
    { uid: 'd4', itemId: 'grand_piano', x: 1, y: 1 },
    { uid: 'd5', itemId: 'grand_piano', x: 5, y: 0 },
  ]
  const critic: Client = {
    id: 'cr1', x: 2, y: 2, tx: 2, ty: 2, phase: 'seated',
    order: '🍝', patience: 60, patienceMax: 60, bodyColor: '#fff', face: '🧑',
    tableUid: 't1', seatedAt: 0, guestKind: 'critic',
  }
  useGameStore.setState({
    level: 5, items, stains: [], clients: [critic], kitchenJobs: [],
    stats: { ...initialStats() }, criticReview: null, reputation: 0,
    inventory: { dough: 99, veggies: 99, meat: 99, fish: 99, cheese: 99, spices: 99 },
    mode: 'live', speed: 1,
  })
  // 5 роялей (5% каждый) + разделочный стол и холодильник (2% каждый) = 29%
  check('атмосфера ≥25% для сценария (5★)', useGameStore.getState().atmosphere() >= 25, `got ${useGameStore.getState().atmosphere()}`)
  const job: KitchenJob = {
    id: 'cj1', clientId: 'cr1', stoveUid: 'k1', startedAt: now - 60_000,
    duration: 6, ready: true, readyAt: now - 30_000, // не «идеально» (>15с), чтобы не путать бонусы
  }
  useGameStore.setState({ kitchenJobs: [job] })
  useGameStore.getState().serveDish('cj1', now)
  let c = useGameStore.getState().clients.find((x) => x.id === 'cr1')!
  check('критик ест после подачи', c.phase === 'eating')
  // ускоряем конец трапезы
  useGameStore.setState({ clients: useGameStore.getState().clients.map((x) => ({ ...x, eatEnd: Date.now() - 1 })) })
  useGameStore.getState().simTick(0.25, Date.now())
  const after = useGameStore.getState()
  check('отзыв критика опубликован (5★: терпение 1.0, 0 пятен, атмо 25)',
    after.criticReview !== null && after.criticReview!.stars === 5, JSON.stringify(after.criticReview))
  check('срок отзыва ~10 минут', after.criticReview !== null && after.criticReview!.until - Date.now() > 9 * 60_000)
  check('criticsServed инкремент', after.stats.criticsServed === 1)
  check('квест critic_1 синхронизирован (1/1)', after.quests.find((q) => q.id === 'critic_1')?.progress === 1)
  check('тост об отзыве', after.toasts.some((t) => t.text.includes('Критик оставил отзыв: 5★')))
  // истечение эффекта
  useGameStore.setState({ criticReview: { stars: 5, until: Date.now() - 1 } })
  useGameStore.getState().simTick(0.25, Date.now())
  check('истёкший отзыв сбрасывается тиком', useGameStore.getState().criticReview === null)
}

// ---------- критик ушёл злым: 1★, без счётчика ----------
console.log('== критик: злой уход → 1★ ==')
{
  const critic: Client = {
    id: 'cr2', x: 2, y: 2, tx: 2, ty: 2, phase: 'seated',
    order: '🍝', patience: 0.01, patienceMax: 60, bodyColor: '#fff', face: '🧑',
    tableUid: 't1', seatedAt: 0, guestKind: 'critic',
  }
  useGameStore.setState({
    level: 5,
    items: [
      { uid: 't1', itemId: 'table_folding', x: 2, y: 2 },
      { uid: 'k1', itemId: 'stove_gas', x: 10, y: 2 },
      { uid: 'k2', itemId: 'cutting_table', x: 11, y: 4 },
      { uid: 'k3', itemId: 'fridge', x: 12, y: 5 },
    ],
    stains: [], clients: [critic], kitchenJobs: [], criticReview: null,
    stats: { ...initialStats() }, mode: 'live', speed: 1, reputation: 5,
  })
  useGameStore.getState().simTick(1, Date.now()) // терпение 0.01 − 1с → злой уход
  const after = useGameStore.getState()
  check('злой критик: отзыв 1★', after.criticReview !== null && after.criticReview!.stars === 1, JSON.stringify(after.criticReview))
  check('злой критик НЕ считается обслуженным', after.stats.criticsServed === 0)
  check('−2⭐ репутации за злого клиента: 5 → 3', after.reputation === 3, `got ${after.reputation}`)
}

// ---------- санинспекция ----------
console.log('== санинспекция: штраф и успех ==')
{
  const baseItems = [
    { uid: 't1', itemId: 'table_folding', x: 2, y: 2 },
    { uid: 'k1', itemId: 'stove_gas', x: 10, y: 2 },
    { uid: 'k2', itemId: 'cutting_table', x: 11, y: 4 },
    { uid: 'k3', itemId: 'fridge', x: 12, y: 5 },
  ]
  const visitor: Client = {
    id: 'v1', x: 2, y: 2, tx: 2, ty: 2, phase: 'seated',
    order: '🍝', patience: 60, patienceMax: 60, bodyColor: '#fff', face: '🧑', tableUid: 't1',
  }
  // грязный зал: 3 активных пятна → штраф
  useGameStore.setState({
    level: 6, items: baseItems, clients: [visitor], kitchenJobs: [], reputation: 10,
    coins: 1000, stats: { ...initialStats() }, stains: [
      { id: 's1', x: 0, y: 0, kind: 'floor', createdAt: 1 },
      { id: 's2', x: 1, y: 1, kind: 'floor', createdAt: 1 },
      { id: 's3', x: 3, y: 3, kind: 'floor', createdAt: 1 },
    ],
    mode: 'live', speed: 1,
  })
  forceNextInspectionAt(Date.now())
  useGameStore.getState().simTick(0.25, Date.now())
  let st = useGameStore.getState()
  check('штраф: −10% (мин 50): 1000 → 900', st.coins === 900, `got ${st.coins}`)
  check('штраф: −3⭐ репутации: 10 → 7', st.reputation === 7, `got ${st.reputation}`)
  check('тост о штрафе', st.toasts.some((t) => t.text.includes('Санинспекция: штраф')))
  check('провал не считается пройденным', st.stats.inspectionsPassed === 0)
  // чистый зал → награда
  useGameStore.setState({
    stains: [], coins: 1000, reputation: 10, stats: { ...initialStats() },
    clients: [visitor],
  })
  forceNextInspectionAt(Date.now())
  useGameStore.getState().simTick(0.25, Date.now())
  st = useGameStore.getState()
  check('успех: +150🪙 +2⭐', st.coins === 1150 && st.reputation === 12, `got ${st.coins}/${st.reputation}`)
  check('inspectionsPassed инкремент', st.stats.inspectionsPassed === 1)
  check('квест inspection_3 синхронизирован', st.quests.find((q) => q.id === 'inspection_3')?.progress === 1)
  check('тост об успехе', st.toasts.some((t) => t.text.includes('Санинспекция пройдена')))
  // пустой зал: инспекция не срабатывает
  useGameStore.setState({ clients: [], coins: 1000, stats: { ...initialStats() } })
  forceNextInspectionAt(Date.now())
  useGameStore.getState().simTick(0.25, Date.now())
  st = useGameStore.getState()
  check('пустой зал — инспекция пропускается', st.coins === 1000 && st.stats.inspectionsPassed === 0)
}

// ---------- фикс продажи гем-эксклюзивов ----------
console.log('== sellItem: гем-эксклюзив не продаётся ==')
{
  useGameStore.setState({
    coins: 500,
    items: [
      { uid: 't1', itemId: 'table_folding', x: 2, y: 2 },
      { uid: 'g1', itemId: 'fountain', x: 5, y: 2 }, // gemPrice 40
    ],
    clients: [], kitchenJobs: [],
  })
  useGameStore.getState().sellItem('g1')
  const st = useGameStore.getState()
  check('эксклюзив остался на сцене', st.items.some((i) => i.uid === 'g1'))
  check('монеты не начислены', st.coins === 500)
  check('тост об отказе', st.toasts.some((t) => t.text.includes('Эксклюзив нельзя продать')))
  useGameStore.getState().sellItem('t1')
  check('обычный предмет продаётся как раньше', !useGameStore.getState().items.some((i) => i.uid === 't1'))
}

// ---------- сюжетные квесты на новые метрики ----------
console.log('== новые сюжетные квесты ==')
{
  const q = (id: string) => STORY_QUEST_DEFS.find((x) => x.id === id)
  check('critic_1: ур.5, 1 критик, 400🪙/180✨/5💎',
    !!q('critic_1') && q('critic_1')!.stat === 'criticsServed' && q('critic_1')!.target === 1 &&
    q('critic_1')!.unlockLevel === 5 && q('critic_1')!.reward === 400 && q('critic_1')!.xpReward === 180 && q('critic_1')!.gemReward === 5)
  check('birthday_3: ур.7, 3 праздника, 600🪙/260✨',
    !!q('birthday_3') && q('birthday_3')!.stat === 'birthdaysHosted' && q('birthday_3')!.target === 3 &&
    q('birthday_3')!.unlockLevel === 7 && q('birthday_3')!.reward === 600 && q('birthday_3')!.xpReward === 260)
  check('inspection_3: ур.8, 3 инспекции, 700🪙/300✨',
    !!q('inspection_3') && q('inspection_3')!.stat === 'inspectionsPassed' && q('inspection_3')!.target === 3 &&
    q('inspection_3')!.unlockLevel === 8 && q('inspection_3')!.reward === 700 && q('inspection_3')!.xpReward === 300)
  const stats = initialStats() as GameStats
  stats.criticsServed = 1
  stats.birthdaysHosted = 3
  stats.inspectionsPassed = 3
  check('стартовые статы содержат новые счётчики (инициализация 0)',
    initialStats().criticsServed === 0 && initialStats().birthdaysHosted === 0 && initialStats().inspectionsPassed === 0)
}

// ---------- сохранение/миграция полей ----------
console.log('== persist-поля в состоянии ==')
{
  const st = useGameStore.getState()
  check('criticReview в стейте', 'criticReview' in st)
  check('festival в стейте, неделя текущая', st.festival.weekKey === festivalWeekKey())
  check('mskDateKey работает', /^\d{4}-\d{2}-\d{2}$/.test(mskDateKey()))
}

console.log(failures === 0 ? '\nВСЕ ПРОВЕРКИ ПРОШЛИ' : `\nПРОВАЛОВ: ${failures}`)
process.exit(failures === 0 ? 0 : 1)
