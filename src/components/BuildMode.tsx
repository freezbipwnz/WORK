import { useEffect, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { useGameStore, canPlace } from '@/game/store'
import { FACADE_ZONE, HALL_H, HALL_W, KITCHEN_W, getItem, sellPrice } from '@/game/catalog'
import { isoX, isoY, screenToCell, SCENE_W, SCENE_H, TILE_W, TILE_H } from '@/game/iso'
import { ITEM_SPRITES, spriteUrl } from './sprites'

const DIAMOND = 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)'

/**
 * Оверлей режима расстановки в изометрии (game.md §5, design.md §5):
 * ромбовидная подсветка сетки, ghost-preview за пальцем/курсором (обратная
 * проекция pointer-координат → клетка), тап ставит предмет, тап по
 * размещённому — мини-меню «Переместить / Продать», Esc — отмена.
 */
export default function BuildModeOverlay() {
  const buildItemId = useGameStore((s) => s.buildItemId)
  const movingUid = useGameStore((s) => s.movingUid)
  const items = useGameStore((s) => s.items)
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null)
  const [menu, setMenu] = useState<{ uid: string; x: number; y: number } | null>(null)
  const [confirmSell, setConfirmSell] = useState(false)

  const activeItemId =
    buildItemId ?? (movingUid ? items.find((i) => i.uid === movingUid)?.itemId ?? null : null)
  const activeDef = activeItemId ? getItem(activeItemId) : null

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenu(null)
        useGameStore.getState().cancelBuild()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const valid =
    hover && activeItemId
      ? canPlace(items, activeItemId, hover.x, hover.y, movingUid ?? undefined)
      : false

  /** pointer → клетка сетки через обратную изо-проекцию (с учётом scale сцены) */
  const cellFromEvent = (e: ReactPointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const k = rect.width / SCENE_W || 1
    const sx = (e.clientX - rect.left) / k
    const sy = (e.clientY - rect.top) / k
    return screenToCell(sx, sy)
  }

  const cells = []
  for (let y = 0; y < HALL_H; y++) {
    for (let x = 0; x < HALL_W + KITCHEN_W; x++) {
      cells.push({ x, y })
    }
  }
  // предмет фасада «на курсоре» — подсвечиваем фасадную зону улицы
  if (activeDef?.zone === 'street') {
    for (let x = FACADE_ZONE.x0; x <= FACADE_ZONE.x1; x++) {
      cells.push({ x, y: FACADE_ZONE.y })
    }
  }

  // ghost-ромб размера предмета
  const gw = activeDef ? (activeDef.w + activeDef.h) * (TILE_W / 2) : 0
  const gh = activeDef ? (activeDef.h + activeDef.w) * (TILE_H / 2) : 0
  const gcx = hover && activeDef ? isoX(hover.x + activeDef.w / 2 - 0.5, hover.y + activeDef.h / 2 - 0.5) : 0
  const gcy = hover && activeDef ? isoY(hover.x + activeDef.w / 2 - 0.5, hover.y + activeDef.h / 2 - 0.5) : 0

  return (
    <div
      className="absolute inset-0"
      style={{ zIndex: 500, touchAction: 'none' }}
      onContextMenu={(e) => {
        e.preventDefault()
        setMenu(null)
        useGameStore.getState().cancelBuild()
      }}
      onPointerMove={(e) => setHover(cellFromEvent(e))}
      onPointerLeave={() => setHover(null)}
      onPointerDown={(e) => {
        const c = cellFromEvent(e)
        setHover(c)
        setMenu(null)
        setConfirmSell(false)
        if (activeItemId) useGameStore.getState().placeBuildItem(c.x, c.y)
      }}
    >
      {/* ромбовидная подсветка сетки */}
      {cells.map((c) => (
        <div
          key={`${c.x}-${c.y}`}
          className="anim-grid-pulse pointer-events-none absolute"
          style={{
            left: isoX(c.x, c.y) - TILE_W / 2,
            top: isoY(c.x, c.y) - TILE_H / 2,
            width: TILE_W,
            height: TILE_H,
            clipPath: DIAMOND,
            background: 'transparent',
            boxShadow: 'none',
            outline: 'none',
            border: 'none',
            // шов: вложенный чуть меньший ромб оставляет кольцо 1px
            backgroundImage: 'none',
          }}
        >
          <div
            className="absolute inset-0"
            style={{ clipPath: DIAMOND, background: 'rgba(92,70,51,0.22)' }}
          />
          <div
            className="absolute"
            style={{ inset: 1.5, clipPath: DIAMOND, background: 'rgba(253,249,238,0.12)' }}
          />
        </div>
      ))}

      {/* ghost-preview: ромб валид/невалид + эмодзи */}
      {hover && activeDef && (
        <div
          className="pointer-events-none absolute"
          style={{
            left: gcx - gw / 2,
            top: gcy - gh / 2,
            width: gw,
            height: gh,
            zIndex: 600,
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              clipPath: DIAMOND,
              background: valid ? 'rgba(143,174,124,0.55)' : 'rgba(201,111,111,0.55)',
            }}
          />
          {activeItemId && ITEM_SPRITES[activeItemId] ? (
            <img
              src={spriteUrl(ITEM_SPRITES[activeItemId])}
              alt=""
              draggable={false}
              className="pointer-events-none absolute left-1/2 top-1/2 block h-auto select-none"
              style={{ opacity: 0.7, width: Math.max(gw * 0.95, 56), transform: 'translate(-50%,-85%)' }}
            />
          ) : (
            <span
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-3xl"
              style={{ opacity: 0.55, transform: 'translate(-50%,-130%)' }}
            >
              {activeDef.emoji}
            </span>
          )}
        </div>
      )}

      {/* кликабельные размещённые предметы (мини-меню) — ромбовидные зоны */}
      {!activeItemId &&
        items.map((p) => {
          const d = getItem(p.itemId)
          if (!d) return null
          const w = (d.w + d.h) * (TILE_W / 2)
          const h = (d.w + d.h) * (TILE_H / 2)
          const cx = isoX(p.x + d.w / 2 - 0.5, p.y + d.h / 2 - 0.5)
          const cy = isoY(p.x + d.w / 2 - 0.5, p.y + d.h / 2 - 0.5)
          return (
            <button
              key={p.uid}
              type="button"
              aria-label={d.name}
              className="absolute cursor-pointer transition-colors hover:bg-terracotta/25"
              style={{
                left: cx - w / 2,
                top: cy - h / 2,
                width: w,
                height: h,
                clipPath: DIAMOND,
                zIndex: 550,
              }}
              onPointerDown={(e) => {
                e.stopPropagation()
                setConfirmSell(false)
                setMenu({ uid: p.uid, x: p.x, y: p.y })
              }}
            />
          )
        })}

      {/* контекстное мини-меню ×1.5 (внутри зоны сцены, кламп к краям) */}
      {menu &&
        (() => {
          const placed = items.find((i) => i.uid === menu.uid)
          const def = placed ? getItem(placed.itemId) : null
          if (!placed || !def) return null
          const MENU_W = 216
          const MENU_H = confirmSell ? 210 : 178
          const left = Math.min(Math.max(isoX(menu.x, menu.y) - MENU_W / 2, 8), SCENE_W - MENU_W - 8)
          const top = Math.min(Math.max(isoY(menu.x, menu.y) - MENU_H - 14, 8), SCENE_H - MENU_H - 8)
          const close = () => {
            setMenu(null)
            setConfirmSell(false)
          }
          return (
            <div
              className="anim-pop-in absolute flex flex-col gap-1.5 rounded-2xl bg-paper p-3 shadow-panel outline-cozy"
              style={{ left, top, width: MENU_W, zIndex: 700 }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-display text-base font-bold text-cocoa">
                  {def.emoji} {def.name}
                </span>
                <button
                  type="button"
                  aria-label="Закрыть"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg font-bold text-cocoa-soft hover:bg-wall active:scale-95"
                  onClick={close}
                >
                  ✕
                </button>
              </div>
              {confirmSell ? (
                <>
                  <p className="font-display text-base font-bold text-cocoa">
                    Продать {def.name} за {sellPrice(def.price)}🪙?
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="min-h-[48px] flex-1 rounded-xl bg-berry px-3 font-display text-base font-bold text-paper shadow-sticker active:scale-95"
                      onClick={() => {
                        useGameStore.getState().sellItem(menu.uid)
                        close()
                      }}
                    >
                      Продать
                    </button>
                    <button
                      type="button"
                      className="min-h-[48px] flex-1 rounded-xl bg-wall px-3 font-display text-base font-bold text-cocoa active:scale-95"
                      onClick={() => setConfirmSell(false)}
                    >
                      Отмена
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="min-h-[48px] rounded-xl px-4 py-1.5 text-left font-display text-base font-bold text-cocoa hover:bg-wall active:scale-95"
                    onClick={() => {
                      useGameStore.getState().startMoveItem(menu.uid)
                      close()
                    }}
                  >
                    ✋ Переместить
                  </button>
                  <button
                    type="button"
                    className="min-h-[48px] rounded-xl px-4 py-1.5 text-left font-display text-base font-bold text-berry hover:bg-berry/15 active:scale-95"
                    onClick={() => setConfirmSell(true)}
                  >
                    💰 Продать за {sellPrice(def.price)}🪙
                  </button>
                </>
              )}
            </div>
          )
        })()}

      {/* подсказка */}
      <div
        className="pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-cocoa/80 px-4 py-1.5 font-display text-xs font-bold text-paper"
        style={{ zIndex: 700 }}
      >
        {activeDef
          ? `${activeDef.emoji} ${activeDef.name} — тапни по ромбу, чтобы поставить. Esc — отмена`
          : 'Тапни по предмету, чтобы переместить или продать. Esc — отмена'}
      </div>
    </div>
  )
}
