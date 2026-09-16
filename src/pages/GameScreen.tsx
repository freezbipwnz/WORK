import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore, saveGame } from '@/game/store'
import { pauseRealtimeTimers, resumeRealtimeTimers } from '@/game/simulation'
import Hud from '@/components/Hud'
import Scene, { SCENE_SIZE } from '@/components/Scene'
import TabPanelSlot from '@/components/TabPanelSlot'
import Onboarding from '@/components/Onboarding'
import StovePopup from '@/components/StovePopup'
import EatingBars from '@/components/EatingBars'
import Tutorial from '@/components/Tutorial'
import GameButton from '@/components/ui/GameButton'
import { cn } from '@/lib/utils'

const ZOOM_MIN = 0.5
const ZOOM_MAX = 2.5
const TAP_SLOP = 6

type Pt = { x: number; y: number }

/**
 * Вьюпорт сцены: вписанный масштаб k (сцена всегда целиком и по центру),
 * зум 0.5×–2.5× (pinch / колесо / кнопки), пан с клампом к краям.
 * Тап (<6px сдвига) не конфликтует с кликами по предметам.
 */
function SceneViewport() {
  const ref = useRef<HTMLDivElement>(null)
  const [zone, setZone] = useState({ w: 0, h: 0 })
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState<Pt>({ x: 0, y: 0 })
  const mode = useGameStore((s) => s.mode)
  const ptrs = useRef(new Map<number, Pt>())
  const gesture = useRef({ moved: false, downX: 0, downY: 0, lastX: 0, lastY: 0, pinchD: 0 })
  const suppressClick = useRef(false)
  const stateRef = useRef({ zoom, pan, zone, mode })
  stateRef.current = { zoom, pan, zone, mode }

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setZone({ w: el.clientWidth, h: el.clientHeight })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    update()
    return () => ro.disconnect()
  }, [])

  const fitK = (zn = stateRef.current.zone) =>
    zn.w > 0 && zn.h > 0 ? Math.min(zn.w / SCENE_SIZE.w, zn.h / SCENE_SIZE.h) : 1
  const k = fitK()
  const s = k * zoom

  /** Кламп пана: при зуме ≤ вписанного пан сбрасывается в центр */
  const clampPan = (z: number, p: Pt, zn = stateRef.current.zone): Pt => {
    const sc = fitK(zn) * z
    const mx = Math.max(0, (SCENE_SIZE.w * sc - zn.w) / 2)
    const my = Math.max(0, (SCENE_SIZE.h * sc - zn.h) / 2)
    return {
      x: mx === 0 ? 0 : Math.min(mx, Math.max(-mx, p.x)),
      y: my === 0 ? 0 : Math.min(my, Math.max(-my, p.y)),
    }
  }

  /** Зум к z вокруг точки (cx, cy) относительно центра зоны */
  const zoomTo = (z: number, cx = 0, cy = 0) => {
    const { zoom: z0, pan: p0, zone: zn } = stateRef.current
    const zz = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z))
    const ratio = zz / (z0 || 1)
    const p1 = { x: cx - (cx - p0.x) * ratio, y: cy - (cy - p0.y) * ratio }
    setZoom(zz)
    setPan(clampPan(zz, p1, zn))
  }

  // колесо мыши (не-passive, чтобы отключить зум страницы)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const r = el.getBoundingClientRect()
      zoomTo(stateRef.current.zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15),
        e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const rel = (e: ReactPointerEvent): Pt => {
    const r = ref.current!.getBoundingClientRect()
    return { x: e.clientX - r.left - r.width / 2, y: e.clientY - r.top - r.height / 2 }
  }

  /** Захват указателя — только когда жест стал паном/пинчем.
   *  Захватывать на pointerdown НЕЛЬЗЯ: Chrome ретаргетит click на вьюпорт,
   *  и тапы по столам/предметам в сцене перестают работать. */
  const capture = (id: number) => {
    try {
      ref.current?.setPointerCapture(id)
    } catch {
      /* указатель уже отпущен */
    }
  }

  const onPointerDown = (e: ReactPointerEvent) => {
    const p = rel(e)
    ptrs.current.set(e.pointerId, p)
    const g = gesture.current
    if (ptrs.current.size === 1) {
      g.moved = false
      g.downX = g.lastX = p.x
      g.downY = g.lastY = p.y
    } else if (ptrs.current.size === 2) {
      // pinch — захватываем оба пальца
      ptrs.current.forEach((_, id) => capture(id))
      const [a, b] = [...ptrs.current.values()]
      g.pinchD = Math.hypot(a.x - b.x, a.y - b.y)
      g.moved = true
    }
  }

  const onPointerMove = (e: ReactPointerEvent) => {
    if (!ptrs.current.has(e.pointerId)) return
    const p = rel(e)
    ptrs.current.set(e.pointerId, p)
    const g = gesture.current
    if (ptrs.current.size === 2) {
      // pinch-to-zoom вокруг середины между пальцами
      const [a, b] = [...ptrs.current.values()]
      const d = Math.hypot(a.x - b.x, a.y - b.y)
      if (g.pinchD > 0 && d > 0) {
        zoomTo(stateRef.current.zoom * (d / g.pinchD), (a.x + b.x) / 2, (a.y + b.y) / 2)
      }
      g.pinchD = d
    } else if (ptrs.current.size === 1) {
      if (!g.moved && Math.hypot(p.x - g.downX, p.y - g.downY) > TAP_SLOP) {
        g.moved = true
        capture(e.pointerId) // жест стал паном — теперь можно захватывать
      }
      // однопальцевый пан — только в live-режиме (в build тап ставит предмет)
      if (g.moved && stateRef.current.mode !== 'build') {
        setPan((prev) =>
          clampPan(stateRef.current.zoom, { x: prev.x + p.x - g.lastX, y: prev.y + p.y - g.lastY }),
        )
      }
      g.lastX = p.x
      g.lastY = p.y
    }
  }

  const onPointerEnd = (e: ReactPointerEvent) => {
    ptrs.current.delete(e.pointerId)
    const g = gesture.current
    if (g.moved) {
      suppressClick.current = true
      setTimeout(() => (suppressClick.current = false), 80)
    }
    if (ptrs.current.size === 1) {
      // после pinch оставшийся палец — новый базис без прыжка
      const [p] = [...ptrs.current.values()]
      g.downX = g.lastX = p.x
      g.downY = g.lastY = p.y
    }
    if (ptrs.current.size === 0) g.moved = false
  }

  return (
    <div
      ref={ref}
      className="absolute inset-0 overflow-hidden"
      style={{ touchAction: 'none' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onClickCapture={(e) => {
        if (suppressClick.current) {
          e.stopPropagation()
          e.preventDefault()
          suppressClick.current = false
        }
      }}
    >
      {zone.w > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25, delay: 0.05 }}
          className="select-none"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: SCENE_SIZE.w,
            height: SCENE_SIZE.h,
            transform: `translate(${zone.w / 2 + pan.x}px, ${zone.h / 2 + pan.y}px) scale(${s}) translate(${-SCENE_SIZE.w / 2}px, ${-SCENE_SIZE.h / 2}px)`,
            transformOrigin: '0 0',
          }}
        >
          <Scene />
          {/* прогресс-бары «кушает 🍽» — отдельный слой поверх сцены (Scene.tsx не трогаем) */}
          <EatingBars />
        </motion.div>
      )}

      {/* кнопки зума (тач-таргеты 44px); отступы — с safe-area, чтобы на
          «чёлке»/с скруглёнными углами не залезали под экран */}
      <div
        className="absolute z-[60] flex flex-col gap-2"
        style={{
          right: 'calc(0.5rem + env(safe-area-inset-right, 0px))',
          bottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <button
          type="button"
          aria-label="Приблизить"
          className="outline-cozy flex h-11 w-11 items-center justify-center rounded-full bg-paper font-display text-xl font-bold md:h-12 md:w-12 md:text-2xl xl:h-14 xl:w-14 xl:text-3xl text-cocoa shadow-panel active:scale-95"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            zoomTo(stateRef.current.zoom * 1.3)
          }}
        >
          +
        </button>
        <button
          type="button"
          aria-label="Отдалить"
          className="outline-cozy flex h-11 w-11 items-center justify-center rounded-full bg-paper font-display text-xl font-bold md:h-12 md:w-12 md:text-2xl xl:h-14 xl:w-14 xl:text-3xl text-cocoa shadow-panel active:scale-95"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            zoomTo(stateRef.current.zoom / 1.3)
          }}
        >
          −
        </button>
      </div>
    </div>
  )
}

/** Тосты — строго в toast-зоне под HUD (design.md §6.3), pointer-events только на тосте */
function Toasts() {
  const toasts = useGameStore((s) => s.toasts)
  const dismissToast = useGameStore((s) => s.dismissToast)
  return (
    <div className="toast-zone">
      <AnimatePresence>
        {toasts.slice(-2).map((t) => (
          <motion.button
            key={t.id}
            type="button"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 18 }}
            onClick={() => dismissToast(t.id)}
            className={cn(
              'pointer-events-auto rounded-2xl bg-paper px-4 py-2 font-display text-sm font-bold shadow-panel outline-cozy',
              t.kind === 'success' && 'text-sage',
              t.kind === 'error' && 'text-berry',
              t.kind === 'info' && 'text-cocoa',
            )}
          >
            {t.text}
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  )
}

export default function GameScreen() {
  const [confirmReset, setConfirmReset] = useState(false)

  // --- тик симуляции (250ms), в build mode — пауза (simTick сам игнорирует) ---
  useEffect(() => {
    let last = performance.now()
    const id = setInterval(() => {
      if (document.visibilityState === 'hidden') {
        // скрытая вкладка: симуляция на паузе, базу dt держим актуальной
        last = performance.now()
        return
      }
      const now = performance.now()
      // кламп dt ≤ 1с игрового времени — защита от прыжка после сна/лаг-спайка
      const dt = Math.min((now - last) / 1000, 1)
      last = now
      useGameStore.getState().simTick(dt, Date.now())
    }, 250)
    return () => clearInterval(id)
  }, [])

  // --- автосохранение: 30с + visibilitychange ---
  useEffect(() => {
    const doSave = () => {
      saveGame(useGameStore.getState())
      useGameStore.getState().markSaved()
    }
    const id = setInterval(doSave, 30_000)
    const onVis = () => {
      if (document.visibilityState === 'hidden') {
        doSave()
        pauseRealtimeTimers() // пауза симуляции на скрытой вкладке
      } else {
        // сдвигаем таймеры реального времени (startedAt/eatUntil/lastMove) на длительность сна —
        // без офлайн-прогресса и без мгновенных angry/готовок
        resumeRealtimeTimers()
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  return (
    <>
      {/* ===== row 1: HUD ===== */}
      <div className="zone-hud">
        <Hud onReset={() => setConfirmReset(true)} />
      </div>

      {/* ===== row 2: изо-сцена (вьюпорт с зумом/паном, тосты — ниже HUD, в зоне сцены) ===== */}
      <div className="zone-scene">
        <SceneViewport />
        <Toasts />
        {/* попап уровня/апгрейда плиты (тап по свободной плите) */}
        <StovePopup />
        {/* текстовое обучение новичка (карточка внизу сцены, только если !tutorialDone) */}
        <Tutorial />
      </div>

      {/* ===== row 3: нижняя таб-панель ===== */}
      <div className="zone-panel">
        <TabPanelSlot />
      </div>

      {/* ===== Онбординг-оверлей (первый запуск) ===== */}
      <Onboarding />

      {/* ===== Confirm-сброс (модалка — легальное перекрытие) ===== */}
      {confirmReset && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-cocoa/35"
          onClick={() => setConfirmReset(false)}
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 18 }}
            className="flex w-[320px] max-w-[90vw] flex-col gap-3 rounded-2xl bg-paper p-5 shadow-panel"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <h2 className="font-display text-xl font-bold text-cocoa">
              Стереть ресторан и начать заново?
            </h2>
            <p className="text-sm text-cocoa-soft">
              Весь прогресс, мебель и монеты будут удалены.
            </p>
            <div className="flex justify-end gap-2">
              <GameButton variant="ghost" onClick={() => setConfirmReset(false)}>
                Отмена
              </GameButton>
              <GameButton
                variant="destructive"
                onClick={() => {
                  useGameStore.getState().resetGame()
                  setConfirmReset(false)
                }}
              >
                Стереть
              </GameButton>
            </div>
          </motion.div>
        </div>
      )}
    </>
  )
}
