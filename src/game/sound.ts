/**
 * Звуковой движок RestoCity.
 *
 * - Ассеты: public/audio/*.mp3, пути через import.meta.env.BASE_URL (сайт на /WORK/).
 * - Автоплей-политика: AudioContext/музыка стартуют только после первого жеста
 *   пользователя (pointerdown) — до этого все play* тихо откладываются.
 * - Фоновая музыка: HTMLAudio loop, volume 0.35; SFX — Audio-элементы, volume 0.6.
 * - Глобальный mute persist'ится отдельным ключом localStorage `restocity_muted`
 *   и синхронизируется со сторовым флагом soundOn (кнопка 🔊/🔇 в Hud).
 * - Интеграция без правок simulation.ts: подписки на useGameStore —
 *   diff kitchenJobs (старт готовки / готовность), stats.servedClients (подача+монеты),
 *   тосты kind 'error' (ошибки).
 */
import { useGameStore } from './store'

const MUTE_KEY = 'restocity_muted'
const BASE = import.meta.env.BASE_URL

const SFX_SRC = {
  tap: `${BASE}audio/tap.mp3`,
  cook: `${BASE}audio/cook_start.mp3`,
  ready: `${BASE}audio/dish_ready.mp3`,
  serve: `${BASE}audio/serve.mp3`,
  coins: `${BASE}audio/coins.mp3`,
  quest: `${BASE}audio/quest_done.mp3`,
  error: `${BASE}audio/error.mp3`,
} as const

type SfxName = keyof typeof SFX_SRC

const SFX_VOLUME = 0.6
const MUSIC_VOLUME = 0.35

let muted = typeof localStorage !== 'undefined' && localStorage.getItem(MUTE_KEY) === '1'
let unlocked = false // был ли первый жест пользователя (автоплей-политика)
let musicStarted = false
let music: HTMLAudioElement | null = null
const sfxPool = new Map<SfxName, HTMLAudioElement>()

function ensureMusic(): HTMLAudioElement {
  if (!music) {
    music = new Audio(`${BASE}audio/bg_music.mp3`)
    music.loop = true
    music.volume = MUSIC_VOLUME
    music.preload = 'auto'
  }
  return music
}

function sfx(name: SfxName): HTMLAudioElement {
  let el = sfxPool.get(name)
  if (!el) {
    el = new Audio(SFX_SRC[name])
    el.preload = 'auto'
    el.volume = SFX_VOLUME
    sfxPool.set(name, el)
  }
  return el
}

function playSfx(name: SfxName): void {
  if (muted || !unlocked) return
  try {
    // клонируем ноду — допускаем наложение одинаковых звуков
    const inst = sfx(name).cloneNode() as HTMLAudioElement
    inst.volume = SFX_VOLUME
    void inst.play().catch(() => {})
  } catch {
    /* аудио недоступно — молча пропускаем */
  }
}

export function playTap(): void {
  playSfx('tap')
}
export function playCook(): void {
  playSfx('cook')
}
export function playReady(): void {
  playSfx('ready')
}
export function playServe(): void {
  playSfx('serve')
}
export function playCoins(): void {
  playSfx('coins')
}
export function playQuest(): void {
  playSfx('quest')
}
export function playError(): void {
  playSfx('error')
}

export function startMusic(): void {
  if (muted || !unlocked || musicStarted) return
  musicStarted = true
  void ensureMusic()
    .play()
    .catch(() => {
      musicStarted = false // браузер отказал — попробуем при следующем жесте
    })
}

function stopMusic(): void {
  music?.pause()
  musicStarted = false
}

export function isMuted(): boolean {
  return muted
}

export function setMuted(m: boolean): void {
  muted = m
  try {
    localStorage.setItem(MUTE_KEY, m ? '1' : '0')
  } catch {
    /* приватный режим — без persist */
  }
  if (m) stopMusic()
  else startMusic()
}

/** Разблокировка звука по первому жесту (автоплей-политика браузеров). */
function unlock(): void {
  if (unlocked) return
  unlocked = true
  // прогреваем AudioContext, если браузер его поддерживает (для будущих WebAudio SFX)
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (Ctx) void new Ctx().resume().catch(() => {})
  } catch {
    /* noop */
  }
  startMusic()
}

let initialized = false

/**
 * Устанавливает глобальные слушатели и подписки на стор.
 * Вызывается один раз из store.ts после создания useGameStore.
 */
export function initSound(): void {
  if (initialized || typeof window === 'undefined') return
  initialized = true

  // начальный mute из отдельного ключа имеет приоритет над сейвом
  if (muted && useGameStore.getState().soundOn) {
    useGameStore.setState({ soundOn: false })
  } else if (!muted && !useGameStore.getState().soundOn) {
    muted = true // стор выключен раньше — уважаем
  }

  window.addEventListener('pointerdown', unlock, { once: false })

  let prev = useGameStore.getState()
  useGameStore.subscribe((s) => {
    const p = prev
    prev = s

    // mute-синк: кнопка 🔊/🔇 в Hud переключает soundOn
    if (s.soundOn !== p.soundOn) setMuted(!s.soundOn)

    // тап по сцене = любой клик пользователя — разблокировка/музыка
    if (s.kitchenJobs !== p.kitchenJobs) {
      const prevById = new Map(p.kitchenJobs.map((j) => [j.id, j]))
      for (const j of s.kitchenJobs) {
        const old = prevById.get(j.id)
        if (!old && !j.ready) playCook() // новая готовка (тап/автоповар/доставка)
        else if (old && !old.ready && j.ready) playReady() // блюдо готово
      }
    }

    // подача блюда: servedClients растёт (ручная и официантом)
    if (s.stats.servedClients > p.stats.servedClients) {
      playServe()
      playCoins()
    }

    // ошибки: новый тост kind 'error'
    if (s.toasts !== p.toasts) {
      const prevIds = new Set(p.toasts.map((t) => t.id))
      for (const t of s.toasts) {
        if (prevIds.has(t.id)) continue
        if (t.kind === 'error') playError()
        // события фаз: инспекция пройдена / награды — quest-звук; плохой отзыв критика — error
        if (t.text.includes('Санинспекция пройдена')) playQuest()
        if (t.text.includes('Критик оставил отзыв')) {
          const m = t.text.match(/(\d)★/)
          const stars = m ? Number(m[1]) : 3
          if (stars >= 4) playQuest()
          else if (stars <= 2) playError()
        }
      }
    }
  })
}
