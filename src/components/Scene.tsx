import { memo, useEffect, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '@/game/store'
import { DOOR, HALL_H, curbRowAt, gridWAt, hallHAt, hallWAt, streetRowsAt, getItem, pxOffsetToCells, seatOffsets } from '@/game/catalog'
import { isoX, isoY, zOrder, Z, SCENE_W, SCENE_H, ORIGIN_Y, WALL_H, TILE_W, TILE_H } from '@/game/iso'
import type { Client, Pedestrian, PlacedItem, StaffNpc, Stain } from '@/game/types'
import { cn } from '@/lib/utils'
import { CHAIR_SPRITE, CUSTOMER_SPRITES, DISH_SPRITES, ITEM_SPRITES, STAFF_SPRITES, customerSprite, spriteUrl } from './sprites'
import BuildModeOverlay from './BuildMode'

const DIAMOND = 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)'

// dev-отладка: стор в консоли/headless-автотестах (только dev-server, в проде не попадает)
if (import.meta.env.DEV) {
  ;(window as unknown as { __game?: typeof useGameStore }).__game = useGameStore
}

// ---------- базовые изо-примитивы (design.md §5.3) ----------

/** Ромб-тайл пола через clip-path */
function Diamond({
  x,
  y,
  wCells = 1,
  hCells = 1,
  bg,
  className,
  style,
}: {
  x: number
  y: number
  wCells?: number
  hCells?: number
  bg: string
  className?: string
  style?: CSSProperties
}) {
  const w = (wCells + hCells) * (TILE_W / 2)
  const h = (wCells + hCells) * (TILE_H / 2)
  const cx = isoX(x + wCells / 2 - 0.5, y + hCells / 2 - 0.5)
  const cy = isoY(x + wCells / 2 - 0.5, y + hCells / 2 - 0.5)
  return (
    <div
      className={cn('absolute', className)}
      style={{
        left: cx - w / 2,
        top: cy - h / 2,
        width: w,
        height: h,
        clipPath: DIAMOND,
        background: bg,
        ...style,
      }}
    />
  )
}

/** Эллиптическая изо-тень на полу (scaleY 0.5, §2) */
function IsoShadow({ x, y, w }: { x: number; y: number; w: number }) {
  return (
    <div
      className="pointer-events-none absolute"
      style={{
        left: isoX(x, y) - w / 2,
        top: isoY(x, y) + 2,
        width: w,
        height: w / 2,
        zIndex: zOrder(x, y, Z.shadow),
        background: 'radial-gradient(closest-side, rgba(92,70,51,0.18), transparent 70%)',
        borderRadius: '50%',
      }}
    />
  )
}

/**
 * «2D-стикер» (стиль Restaurant City): эмодзи предмета стоит ВЕРТИКАЛЬНО
 * на ромбовидной платформе-тени, без 3D-экструзии. Мягкая эллиптическая
 * тень, лёгкий bounce-idle. children — детали на платформе (абсолютно,
 * относительно контейнера стикера).
 */
function Sticker({
  x,
  y,
  wCells = 1,
  hCells = 1,
  platform,
  emoji,
  emojiSize = 44,
  emojiClass,
  sprite,
  children,
  className,
  onClick,
  title,
  zLayer = Z.object,
}: {
  x: number
  y: number
  wCells?: number
  hCells?: number
  platform: string
  emoji: string
  /** имя спрайта в public/sprites (без .png); если есть — вместо эмодзи */
  sprite?: string
  emojiSize?: number
  emojiClass?: string
  children?: ReactNode
  className?: string
  onClick?: () => void
  title?: string
  zLayer?: number
}) {
  const fx = x + wCells / 2 - 0.5
  const fy = y + hCells / 2 - 0.5
  const cx = isoX(fx, fy)
  const cy = isoY(fx, fy)
  const box = Math.max(emojiSize + 24, 72)
  // спрайт: ширина по footprint клеток, высота оценивается ~1.15× ширины
  const footW = (wCells + hCells) * (TILE_W / 2)
  const sprW = Math.max(Math.round(footW * 0.95), 56)
  const sprH = Math.round(sprW * 1.15)
  const useW = sprite ? sprW : box
  const useH = sprite ? sprH + 16 : emojiSize + 16
  // Якорь «ног» спрайта: нижняя кромка ромба footprint минус 8px (как у 1×1,
  // где низ стоит на cy+8). Нижний вертекс ромба w×h лежит на (w+h)·TILE_H/4
  // ниже изо-центра — без этого предметы 2×2 «висели» над своей платформой.
  const basePad = (wCells + hCells) * (TILE_H / 4) - 8
  return (
    <>
      {/* ромб-платформа (чуть меньше тайла — «коврик» под предметом) */}
      <Diamond
        x={x}
        y={y}
        wCells={wCells}
        hCells={hCells}
        bg={platform}
        style={{ transform: 'scale(0.92)' }}
      />
      <IsoShadow x={fx} y={fy} w={Math.min((wCells + hCells) * 22, 88)} />
      <div
        className={cn('absolute flex items-end justify-center', onClick && 'cursor-pointer', className)}
        style={{
          left: cx - useW / 2,
          top: cy - useH + basePad,
          width: useW,
          height: useH,
          zIndex: zOrder(fx + wCells / 2, fy + hCells / 2, zLayer),
        }}
        onClick={onClick}
        title={title}
      >
        {sprite ? (
          <img
            src={spriteUrl(sprite)}
            alt={title ?? ''}
            draggable={false}
            className={cn('anim-bounce-idle pointer-events-none block h-auto select-none', emojiClass)}
            style={{
              width: sprW,
              filter: 'drop-shadow(0 3px 2px rgba(92,70,51,0.25))',
            }}
          />
        ) : (
          <span
            className={cn('anim-bounce-idle inline-block leading-none', emojiClass)}
            style={{
              fontSize: emojiSize,
              filter: 'drop-shadow(0 3px 2px rgba(92,70,51,0.25))',
            }}
          >
            {emoji}
          </span>
        )}
        {children}
      </div>
    </>
  )
}

/** Столешница-эллипс по центру платформы стола */
function Tabletop({ bg, w = 52 }: { bg: string; w?: number }) {
  return (
    <div
      className="outline-cozy absolute rounded-full"
      style={{
        left: '50%',
        bottom: 2,
        transform: 'translateX(-50%)',
        width: w,
        height: w / 2,
        background: bg,
        boxShadow: 'inset 0 3px 0 rgba(255,255,255,0.5)',
      }}
    />
  )
}

function Steam() {
  return (
    <div className="pointer-events-none absolute -top-4 left-1/2 -translate-x-1/2" style={{ zIndex: Z.bubble }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="absolute text-sm"
          style={{ left: i * 8 - 8, animation: `steam 1.2s ease-out ${i * 0.35}s infinite` }}
        >
          〰️
        </span>
      ))}
    </div>
  )
}

/** Круговой таймер готовки — строго по центру над плитой */
function CookTimer({ startedAt, duration }: { startedAt: number; duration: number }) {
  const elapsed = (Date.now() - startedAt) / 1000
  const pct = Math.min(1, elapsed / duration)
  return (
    <svg
      className="absolute -top-6 left-1/2 h-5 w-5 -translate-x-1/2 -rotate-90"
      viewBox="0 0 20 20"
    >
      <circle cx="10" cy="10" r="8" fill="#FDF9EE" stroke="#EEDFC7" strokeWidth="3" />
      <circle
        cx="10" cy="10" r="8" fill="none" stroke="#8FAE7C" strokeWidth="3"
        strokeDasharray={`${pct * 50.3} 50.3`}
      />
    </svg>
  )
}

/** Порядок клиента для готового блюда на плите */
function clientOrderFor(stoveUid: string): string {
  const s = useGameStore.getState()
  const job = s.kitchenJobs.find((j) => j.stoveUid === stoveUid)
  return s.clients.find((c) => c.id === job?.clientId)?.order ?? '🍽️'
}

// ---------- мебель и техника ----------

function PlacedItemView({ item }: { item: PlacedItem }) {
  const def = getItem(item.itemId)
  const job = useGameStore((s) => s.kitchenJobs.find((j) => j.stoveUid === item.uid))
  const clients = useGameStore((s) => s.clients)
  const heldDishId = useGameStore((s) => s.heldDishId)
  const mode = useGameStore((s) => s.mode)
  if (!def) return null

  const seated = clients.filter(
    (c) => c.tableUid === item.uid && (c.phase === 'eating' || c.phase === 'seated'),
  )
  const eatingClient = seated[0]
  const clickable = mode === 'live' && (def.isStove || (!!heldDishId && def.category === 'table'))

  const onClick = clickable
    ? () => {
        const st = useGameStore.getState()
        if (def.isStove) st.clickStove(item.uid)
        else if (def.category === 'table') st.clickTable(item.uid)
      }
    : undefined

  switch (item.itemId) {
    case 'table_folding':
      return (
        <Sticker
          x={item.x} y={item.y} platform="#C9B18C" emoji="🪑" emojiSize={40}
          sprite={ITEM_SPRITES.table_folding}
          onClick={onClick} title={def.name}
        >
          {!ITEM_SPRITES.table_folding && <Tabletop bg="#D9B382" w={48} />}
          {eatingClient && (
            <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-lg">
              {DISH_SPRITES[eatingClient.order] ? (
                <img src={spriteUrl(DISH_SPRITES[eatingClient.order])} alt="" draggable={false} className="pointer-events-none h-6 w-6 select-none object-contain" />
              ) : (
                eatingClient.order
              )}
            </span>
          )}
        </Sticker>
      )
    case 'table_wooden':
    case 'table_italian':
      return (
        <Sticker
          x={item.x} y={item.y} wCells={2} hCells={2}
          platform="#C9B18C"
          emoji={item.itemId === 'table_italian' ? '🕯️' : '🪵'}
          emojiSize={44}
          sprite={ITEM_SPRITES[item.itemId]}
          onClick={onClick} title={def.name}
        >
          {!ITEM_SPRITES[item.itemId] && (
            <Tabletop
              w={72}
              bg={
                item.itemId === 'table_italian'
                  ? 'repeating-linear-gradient(45deg,#FDF9EE 0 8px,#C96F6F 8px 16px)'
                  : 'linear-gradient(#C89A6B,#B5875C)'
              }
            />
          )}
          {eatingClient && (
            <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-lg">
              {DISH_SPRITES[eatingClient.order] ? (
                <img src={spriteUrl(DISH_SPRITES[eatingClient.order])} alt="" draggable={false} className="pointer-events-none h-6 w-6 select-none object-contain" />
              ) : (
                eatingClient.order
              )}
            </span>
          )}
        </Sticker>
      )
    case 'stove_gas':
    case 'pizza_oven':
      return (
        <Sticker
          x={item.x} y={item.y} wCells={def.w} hCells={def.h}
          platform={item.itemId === 'pizza_oven' ? '#C98A6B' : '#C4C1B8'}
          emoji={job?.ready && !ITEM_SPRITES[item.itemId] ? clientOrderFor(item.uid) : def.emoji}
          emojiSize={item.itemId === 'pizza_oven' ? 56 : 48}
          emojiClass={job && !job.ready ? 'animate-pulse' : undefined}
          sprite={ITEM_SPRITES[item.itemId]}
          className={job?.ready ? 'anim-ready-pulse' : undefined}
          onClick={onClick} title={def.name}
        >
          {job?.ready && ITEM_SPRITES[item.itemId] && (
            <span className="absolute -top-6 left-1/2 -translate-x-1/2 leading-none">
              {DISH_SPRITES[clientOrderFor(item.uid)] ? (
                <img
                  src={spriteUrl(DISH_SPRITES[clientOrderFor(item.uid)])}
                  alt=""
                  draggable={false}
                  className="pointer-events-none h-8 w-8 select-none object-contain"
                />
              ) : (
                <span className="text-2xl">{clientOrderFor(item.uid)}</span>
              )}
            </span>
          )}
          {item.itemId === 'stove_gas' && !job && (
            <span className="absolute bottom-1 left-1/2 grid -translate-x-1/2 grid-cols-2 gap-1">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className="h-2 w-2 rounded-full" style={{ background: '#5C4633', opacity: 0.5 }} />
              ))}
            </span>
          )}
          {job && !job.ready && (
            <>
              <Steam />
              <CookTimer startedAt={job.startedAt} duration={job.duration} />
            </>
          )}
        </Sticker>
      )
    case 'cutting_table':
      return (
        <Sticker
          x={item.x} y={item.y} platform="#D9C49A" emoji="🔪" emojiSize={44}
          sprite={ITEM_SPRITES.cutting_table} title={def.name}
        />
      )
    case 'fridge':
      return (
        <Sticker
          x={item.x} y={item.y} platform="#C4CFD2" emoji="🧊" emojiSize={46}
          sprite={ITEM_SPRITES.fridge} title={def.name}
        />
      )
    case 'ficus':
      return (
        <Sticker
          x={item.x} y={item.y} platform="#C9B18C" emoji="🪴" emojiSize={46}
          sprite={ITEM_SPRITES.ficus}
          emojiClass="anim-leaf-sway" title={def.name}
        />
      )
    case 'painting':
      // Картина висит на левой стене (за рядом y=0), без тайла пола
      return (
        <div
          className="pointer-events-none absolute"
          style={{
            left: isoX(item.x, 0) - 16,
            top: ORIGIN_Y - 56,
            zIndex: 1,
          }}
        >
          {ITEM_SPRITES.painting ? (
            <img
              src={spriteUrl(ITEM_SPRITES.painting)}
              alt={def.name}
              draggable={false}
              className="pointer-events-none block h-auto w-11 select-none"
              style={{ filter: 'drop-shadow(0 2px 1px rgba(92,70,51,0.3))' }}
            />
          ) : (
            <div className="rounded-md p-1" style={{ background: '#B07F52', border: '2px solid rgba(92,70,51,0.35)' }}>
              <span className="text-2xl">🖼️</span>
            </div>
          )}
        </div>
      )
    case 'floor_lamp':
      return (
        <Sticker
          x={item.x} y={item.y} platform="#C9B18C" emoji="💡" emojiSize={42}
          sprite={ITEM_SPRITES.floor_lamp}
          emojiClass="anim-lamp-flicker" title={def.name}
        >
          <span
            className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2"
            style={{
              width: 44, height: 22, borderRadius: '50%',
              background: 'radial-gradient(closest-side, rgba(232,180,74,0.45), transparent 70%)',
            }}
          />
        </Sticker>
      )
    case 'flower_bed':
      return (
        <Sticker
          x={item.x} y={item.y} platform="#9B9790" emoji="🌷" emojiSize={42}
          sprite={ITEM_SPRITES.flower_bed}
          emojiClass="anim-leaf-sway" title={def.name}
        />
      )
    case 'signboard':
      return (
        <Sticker
          x={item.x} y={item.y} platform="#9B9790" emoji="🪧" emojiSize={44}
          sprite={ITEM_SPRITES.signboard} title={def.name}
        />
      )
    case 'street_lamp':
      return (
        <Sticker
          x={item.x} y={item.y} platform="#9B9790" emoji="🏮" emojiSize={42}
          sprite={ITEM_SPRITES.street_lamp}
          emojiClass="anim-lamp-flicker" title={def.name}
        >
          <span
            className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2"
            style={{
              width: 44, height: 22, borderRadius: '50%',
              background: 'radial-gradient(closest-side, rgba(232,180,74,0.45), transparent 70%)',
            }}
          />
        </Sticker>
      )
    case 'aquarium':
      return (
        <Sticker
          x={item.x} y={item.y} wCells={2} hCells={1}
          platform="linear-gradient(#BFE0EA,#8FB8C9)" emoji="🐟" emojiSize={48}
          sprite={ITEM_SPRITES.aquarium} title={def.name}
        >
          {[0, 1].map((i) => (
            <span
              key={i}
              className="absolute h-1.5 w-1.5 rounded-full bg-white/70"
              style={{ left: `calc(50% + ${i * 22 - 11}px)`, bottom: 6, animation: `bubble-rise 2s linear ${i * 0.9}s infinite` }}
            />
          ))}
        </Sticker>
      )
    default:
      return (
        <Sticker
          x={item.x} y={item.y} wCells={def.w} hCells={def.h}
          platform="#C9B18C" emoji={def.emoji} title={def.name}
        />
      )
  }
}

/** Спрайты столов с уже «впаянными» в арт стульями — отдельные chair.png не рисуем,
    * иначе стулья задваиваются (клиенты всё равно садятся по seatOffsets на нарисованные места) */
const SPRITES_WITH_BAKED_CHAIRS = new Set(['table_wood', 'table_italy'])

/** Стулья вокруг стола: по одному на посадочное место (chair.png с фоллбэком 🪑).
    * Спрайт смотрит сиденьем ВЛЕВО → кресло слева от стола (ox < 0) зеркалим,
    * чтобы сиденье смотрело к центру стола, спинкой наружу. */
function Chairs({ item }: { item: PlacedItem }) {
  const def = getItem(item.itemId)
  if (!def?.seats) return null
  const sprite = ITEM_SPRITES[item.itemId]
  if (sprite && SPRITES_WITH_BAKED_CHAIRS.has(sprite)) return null
  const fx = item.x + def.w / 2 - 0.5
  const fy = item.y + def.h / 2 - 0.5
  const cx = isoX(fx, fy)
  const cy = isoY(fx, fy)
  const offs = seatOffsets(def.seats, def.w)
  const hasSprite = !!CHAIR_SPRITE
  // z передней (нижней) кромки footprint стола — совпадает с zIndex спрайта стола
  const frontZ = zOrder(item.x + def.w - 0.5, item.y + def.h - 0.5, Z.object)
  return (
    <>
      {offs.map(([ox, oy], i) => {
        // поворот к столу: стол справа (кресло слева) → flip; стол слева → как есть
        const flip = ox < -4
        // глубина кресла — от его ФАКТИЧЕСКОЙ точки (seatOffset), а не от центра
        // footprint: у столов 2×2 передние кресла иначе уходили за стол
        const { dx, dy } = pxOffsetToCells(ox, oy)
        const seatZ = zOrder(fx + dx, fy + dy, Z.character - 1)
        return (
          <div
            key={i}
            className="pointer-events-none absolute"
            style={{
              left: cx + ox,
              top: cy + oy,
              // кресла «сверху» стола — позади него (своей глубиной),
              // передние — гарантированно ПЕРЕД столом (painter's algorithm)
              zIndex: oy < -4 ? zOrder(fx + dx, fy + dy, Z.object - 1) : Math.max(seatZ, frontZ + 1),
              transform: 'translate(-50%,-100%)',
            }}
          >
            {hasSprite ? (
              <img
                src={spriteUrl(CHAIR_SPRITE)}
                alt=""
                draggable={false}
                className="block h-auto w-6 select-none"
                style={{
                  filter: 'drop-shadow(0 1px 1px rgba(92,70,51,0.3))',
                  transform: flip ? 'scaleX(-1)' : undefined,
                }}
              />
            ) : (
              <span
                className="inline-block text-base leading-none"
                style={{ transform: flip ? 'scaleX(-1)' : undefined }}
              >
                🪑
              </span>
            )}
          </div>
        )
      })}
    </>
  )
}

// ---------- персонажи ----------

/**
 * Баббл «кушает»: 🍽 + полоска-таймер трапезы (eatStart→eatEnd), строго над
 * головой (~68px выше опорной точки; для сидящего — над его посадочной точкой,
 * т.к. рендерится внутри ClientView на позиции кресла). Единая точка рендера
 * индикатора еды — отдельный оверлей EatingBars отключён (без дублей).
 */
function EatBubble({ start, end, balloon }: { start?: number; end?: number; balloon?: boolean }) {
  // прогресс — по реальному времени: пересчёт в интервале 4 раза в секунду
  const [pct, setPct] = useState(0)
  useEffect(() => {
    const update = () =>
      setPct(
        start !== undefined && end !== undefined
          ? Math.min(1, Math.max(0, (Date.now() - start) / Math.max(1, end - start)))
          : 0,
      )
    update()
    const id = setInterval(update, 250)
    return () => clearInterval(id)
  }, [start, end])
  return (
    <div
      className="anim-bubble-bob absolute left-1/2 -translate-x-1/2 rounded-xl bg-paper px-1.5 py-1 shadow-sticker outline-cozy"
      style={{ top: -68, zIndex: Z.bubble }}
    >
      <div className="flex items-center gap-1">
        <span className="text-xs leading-none">🍽</span>
        {balloon && <span className="text-xs leading-none">🎈</span>}
        <div className="h-1 w-7 overflow-hidden rounded-full bg-wall">
          <div className="h-full rounded-full bg-sage" style={{ width: `${pct * 100}%` }} />
        </div>
      </div>
    </div>
  )
}

const ClientView = memo(function ClientView({ client }: { client: Client }) {
  const moving = client.phase === 'arriving' || client.phase === 'leaving' || client.phase === 'angry-leaving'
  // посадка строго на своё кресло: смещение от изо-центра стола
  const table = useGameStore((s) =>
    client.tableUid ? s.items.find((i) => i.uid === client.tableUid) : undefined,
  )
  const waitLeftSec =
    client.phase === 'waiting' && client.waitingUntil
      ? Math.max(0, Math.ceil((client.waitingUntil - Date.now()) / 1000))
      : 0
  // Статусы над головой: сел (заказ/⏳ + терпение) → 🍽 с полосой таймера
  // (отдельный баббл ниже) → доел 😍 → уходит; терпение вышло → 😠 → уходит.
  const bubble =
    client.phase === 'waiting'
      ? `${waitLeftSec}с`
      : client.phase === 'seated'
        ? useGameStore.getState().kitchenJobs.some((j) => j.clientId === (client.partyId ?? client.id))
          ? '⏳'
          : client.order
        : client.phase === 'eating'
          ? null // «кушает» — отдельный баббл с таймером (EatBubble), без дублей
          : client.phase === 'angry-leaving'
            ? '😠'
            : client.phase === 'leaving'
              ? '😍'
              : null

  const isSeated = client.phase === 'seated' || client.phase === 'eating'
  let seatDx = 0
  let seatDy = 0
  let seatFacing = 1
  // z-order сидящего: от фактической посадочной точки (seatOffset),
  // передние места — гарантированно ПЕРЕД стулом и столом
  let seatedZ: number | null = null
  if (isSeated && table) {
    const def = getItem(table.itemId)
    if (def?.seats) {
      const offs = seatOffsets(def.seats, def.w)
      const [ox, oy] = offs[(client.seatIndex ?? 0) % offs.length]
      const fx = table.x + def.w / 2 - 0.5
      const fy = table.y + def.h / 2 - 0.5
      // изо-центр footprint стола → экранное смещение кресла
      seatDx = isoX(fx, fy) - isoX(client.x, client.y) + ox
      seatDy = isoY(fx, fy) - isoY(client.x, client.y) + oy
      // сидит ЛИЦОМ к столу: место слева от центра (ox<0) → смотрит вправо,
      // спрайт по умолчанию смотрит вправо → flip нужен для мест справа
      seatFacing = ox < 0 ? 1 : -1
      // глубина посадочной точки в изо-клетках (работает для любых w×h)
      const { dx, dy } = pxOffsetToCells(ox, oy)
      const seatZ = zOrder(fx + dx, fy + dy, Z.character)
      // передняя кромка footprint стола = z спрайта стола/кресел-в-арте
      const tableFrontZ = zOrder(table.x + def.w - 0.5, table.y + def.h - 0.5, Z.object)
      // места в передней половине (oy ≥ -4): клиент строго ПЕРЕД стулом и столом;
      // дальние места — своей глубиной (стол частично закрывает ноги, как вживую)
      seatedZ = oy >= -4 ? Math.max(seatZ, tableFrontZ + 2) : seatZ
    }
  }

  const cx = isoX(client.x, client.y) + seatDx
  const cy = isoY(client.x, client.y) + seatDy

  return (
    <motion.div
      className="pointer-events-none absolute"
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{
        scale: 1,
        opacity: client.phase === 'leaving' || client.phase === 'angry-leaving' ? (client.x === DOOR.x ? 0 : 1) : 1,
        left: cx,
        top: cy,
      }}
      exit={{ opacity: 0 }}
      transition={{
        left: { duration: 0.26, ease: 'linear' },
        top: { duration: 0.26, ease: 'linear' },
        scale: { type: 'spring', stiffness: 400, damping: 15 },
      }}
      style={{ width: 0, height: 0, zIndex: seatedZ ?? zOrder(client.x, client.y, Z.character) }}
    >
      {/* изо-тень под ногами (для VIP — золотое кольцо-подсветка) */}
      <div
        className="absolute -translate-x-1/2"
        style={{
          top: 0, width: 28, height: 14,
          background: 'radial-gradient(closest-side, rgba(92,70,51,0.2), transparent 70%)',
          borderRadius: '50%',
        }}
      />
      {client.vip && (
        <div
          className="animate-pulse absolute -translate-x-1/2"
          style={{
            top: -2, width: 40, height: 20,
            borderRadius: '50%',
            border: '2px solid rgba(232,180,74,0.9)',
            background: 'radial-gradient(closest-side, rgba(232,180,74,0.35), transparent 75%)',
          }}
        />
      )}
      {/* позиционирование через CSS-свойство translate — не конфликтует с transform-анимациями;
          flip — scaleX на отдельной обёртке, чтобы не зеркалить баббл и не ломать <img>;
          w-max — обёртка имеет реальную ширину, иначе Tailwind preflight (img{max-width:100%})
          схлопывает спрайт до 0px внутри 0-ширинного контейнера */}
      <div className="relative w-max" style={{ translate: '-50% -100%' }}>
        <div
          className={cn(
            'relative',
            moving ? 'anim-walk-wiggle' : isSeated ? 'anim-seated' : 'anim-bounce-idle',
          )}
        >
          {bubble && (
          <div
            className={cn(
              'anim-bubble-bob absolute left-1/2 -translate-x-1/2 rounded-xl px-1.5 py-0.5 text-sm shadow-sticker outline-cozy',
              client.vip ? 'bg-honey' : 'bg-paper',
            )}
            style={{ top: -46, zIndex: Z.bubble }}
          >
            {client.vip && <span className="mr-0.5">👑</span>}
            {client.guestKind === 'birthday' && client.phase !== 'leaving' && client.phase !== 'angry-leaving' && (
              <span className="mr-0.5">🎈</span>
            )}
            {DISH_SPRITES[bubble] ? (
              <img
                src={spriteUrl(DISH_SPRITES[bubble])}
                alt=""
                draggable={false}
                className="pointer-events-none inline-block h-5 w-5 select-none object-contain align-middle"
              />
            ) : (
              bubble
            )}
            {client.phase === 'seated' && (
              <div className="mt-0.5 h-1 w-7 overflow-hidden rounded-full bg-wall">
                <div
                  className={cn('h-full rounded-full', client.patience > 10 ? 'bg-sage' : 'bg-berry')}
                  style={{ width: `${(client.patience / (client.patienceMax ?? 30)) * 100}%` }}
                />
              </div>
            )}
          </div>
        )}
        {client.phase === 'eating' && (
          <EatBubble start={client.eatStart} end={client.eatEnd} balloon={client.guestKind === 'birthday'} />
        )}
        {CUSTOMER_SPRITES.length ? (
          <div style={{ transform: `scaleX(${moving ? (client.facing ?? 1) : isSeated ? seatFacing : 1})` }}>
            <img
              src={spriteUrl(client.vip ? 'customer_4' : customerSprite(client.id))}
              alt=""
              draggable={false}
              className="pointer-events-none block h-[52px] w-auto select-none"
              style={{ filter: 'drop-shadow(0 2px 1px rgba(92,70,51,0.3))' }}
            />
          </div>
        ) : (
          <span
            className="inline-block text-[34px] leading-none"
            style={{
              filter: 'drop-shadow(0 2px 1px rgba(92,70,51,0.3))',
              transform: `scaleX(${moving ? (client.facing ?? 1) : isSeated ? seatFacing : 1})`,
            }}
          >
            {client.phase === 'angry-leaving' ? '😠' : client.phase === 'eating' ? '😍' : client.face}
          </span>
        )}
        </div>
      </div>
    </motion.div>
  )
})

/** Подвижный NPC персонала (повар/официант): ходит по waypoints, z-order по координатам */
function NpcFigure({
  npc,
  sprite,
  emoji,
  working,
  carriesDish,
}: {
  npc: StaffNpc
  sprite?: string
  emoji: string
  /** анимация работы (покачивание у плиты) */
  working?: boolean
  /** блюдо «в руках» (официант идёт к столу) */
  carriesDish?: boolean
}) {
  const moving = npc.x !== npc.tx || npc.y !== npc.ty || npc.path.length > 0
  return (
    <motion.div
      className="pointer-events-none absolute"
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1, left: isoX(npc.x, npc.y), top: isoY(npc.x, npc.y) }}
      transition={{
        left: { duration: 0.26, ease: 'linear' },
        top: { duration: 0.26, ease: 'linear' },
        scale: { type: 'spring', stiffness: 400, damping: 15 },
      }}
      style={{ width: 0, height: 0, zIndex: zOrder(npc.x, npc.y, Z.character) }}
    >
      {/* изо-тень под ногами */}
      <div
        className="absolute -translate-x-1/2"
        style={{
          top: 0, width: 28, height: 14,
          background: 'radial-gradient(closest-side, rgba(92,70,51,0.2), transparent 70%)',
          borderRadius: '50%',
        }}
      />
      {/* translate — CSS-свойством (не конфликтует с transform-анимациями ходьбы),
          flip — scaleX на отдельной обёртке; w-max — иначе img схлопывается
          max-width:100% до 0px внутри 0-ширинного контейнера */}
      <div className="relative w-max" style={{ translate: '-50% -100%' }}>
        <div
          className={cn('relative', moving || working ? 'anim-walk-wiggle' : 'anim-bounce-idle')}
        >
          {carriesDish && (
            <div
              className="anim-bubble-bob absolute left-1/2 -translate-x-1/2 rounded-xl bg-paper px-1.5 py-0.5 text-sm shadow-sticker outline-cozy"
              style={{ top: -40, zIndex: Z.bubble }}
            >
              🍽️
            </div>
          )}
          <div style={{ transform: `scaleX(${moving ? (npc.facing ?? 1) : 1})` }}>
            {sprite ? (
              <img
                src={spriteUrl(sprite)}
                alt=""
                draggable={false}
                className="pointer-events-none block h-[52px] w-auto select-none"
                style={{ filter: 'drop-shadow(0 2px 1px rgba(92,70,51,0.3))' }}
              />
            ) : (
              <span
                className="inline-block text-[32px] leading-none"
                style={{ filter: 'drop-shadow(0 2px 1px rgba(92,70,51,0.3))' }}
              >
                {emoji}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/** Персонал: повар и официант — живые NPC из стора, уборщик — статичная фигура */
function StaffFigures() {
  const staff = useGameStore((s) => s.staff)
  const expansion = useGameStore((s) => s.expansion)
  // массивы NPC: на каждый нанятый слот cook/waiter — свой StaffNpc
  const cooks = useGameStore((s) => s.cooks)
  const waiters = useGameStore((s) => s.waiters)
  const figures: ReactNode[] = []
  cooks.forEach((cook, i) => {
    figures.push(
      <NpcFigure
        key={`cook_${i}`}
        npc={cook}
        sprite={STAFF_SPRITES.cook}
        emoji="👨‍🍳"
        working={cook.phase === 'working'}
      />,
    )
  })
  waiters.forEach((waiter, i) => {
    figures.push(
      <NpcFigure
        key={`waiter_${i}`}
        npc={waiter}
        sprite={STAFF_SPRITES.waiter}
        emoji="🤵"
        carriesDish={waiter.phase === 'to-table'}
      />,
    )
  })
  if (staff.some((m) => m.role === 'cleaner')) {
    // уборщик остаётся статичным (механика грязи — другой агент)
    const x = 1
    const y = hallHAt(expansion) - 1
    figures.push(
      <motion.div
        key="cleaner"
        className="pointer-events-none absolute text-2xl"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 15 }}
        style={{
          left: isoX(x, y),
          top: isoY(x, y),
          width: 0,
          height: 0,
          zIndex: zOrder(x, y, Z.character),
        }}
      >
        {/* w-max — та же защита от схлопывания img (max-width:100% в 0-ширинном родителе) */}
        <div className="relative w-max" style={{ translate: '-50% -100%' }}>
          {STAFF_SPRITES.cleaner ? (
            <img
              src={spriteUrl(STAFF_SPRITES.cleaner)}
              alt=""
              draggable={false}
              style={{ filter: 'drop-shadow(0 2px 1px rgba(92,70,51,0.3))' }}
              className="anim-bounce-idle pointer-events-none block h-[52px] w-auto select-none"
            />
          ) : (
            <span className="anim-bounce-idle inline-block">🧹</span>
          )}
        </div>
      </motion.div>,
    )
  }
  return <>{figures}</>
}

// ---------- грязь: пятна на столах и лужи на полу ----------

/** Прогресс-бар уборки над пятном (1.5с тап / 6с уборщик) */
function CleanProgress({ durationMs }: { durationMs: number }) {
  return (
    <div
      className="absolute left-1/2 h-1.5 w-9 -translate-x-1/2 overflow-hidden rounded-full bg-paper outline-cozy"
      style={{ top: -18 }}
    >
      <motion.div
        className="h-full rounded-full bg-sage"
        initial={{ width: '0%' }}
        animate={{ width: '100%' }}
        transition={{ duration: durationMs / 1000, ease: 'linear' }}
      />
    </div>
  )
}

function StainView({ stain }: { stain: Stain }) {
  const mode = useGameStore((s) => s.mode)
  const cx = isoX(stain.x, stain.y)
  const cy = isoY(stain.x, stain.y)
  const clickable = mode === 'live' && !stain.cleaning
  const onClick = clickable ? () => useGameStore.getState().cleanStain(stain.id) : undefined

  if (stain.kind === 'floor') {
    // лужа: ромб-пятно на полу ПОД персонажами (слой shadow), лёгкое мерцание
    return (
      <div
        className={cn('absolute', clickable && 'cursor-pointer')}
        style={{ left: cx - 24, top: cy - 12, width: 48, height: 24, zIndex: zOrder(stain.x, stain.y, Z.shadow) }}
        onClick={onClick}
        title="Лужа! Тап — убрать 🧽 (−2% атмосферы)"
      >
        <div
          className="animate-pulse absolute inset-0"
          style={{
            clipPath: DIAMOND,
            background: 'radial-gradient(closest-side, rgba(111,78,55,0.55), rgba(111,78,55,0.25) 70%, transparent)',
          }}
        />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[0.6875rem] leading-none">💧</span>
        {stain.cleaning && (
          <>
            <CleanProgress durationMs={stain.cleaning.durationMs} />
            {stain.cleaning.by === 'cleaner' && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute -top-8 left-1/2 -translate-x-1/2 text-lg">🧹</motion.span>
            )}
          </>
        )}
      </div>
    )
  }

  // пятно на столе: коричневое полупрозрачное + крошки, НАД столешницей
  return (
    <div
      className={cn('absolute', clickable && 'cursor-pointer')}
      style={{
        left: cx - 16,
        top: cy - 40,
        width: 32,
        height: 22,
        zIndex: zOrder(stain.x + 0.9, stain.y + 0.9, Z.object),
      }}
      onClick={onClick}
      title="Пятно на столе! Тап — убрать 🧽 (стол не принимает клиентов)"
    >
      <div
        className="animate-pulse absolute inset-0"
        style={{
          background: 'rgba(120,72,40,0.55)',
          borderRadius: '50%',
          boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.25)',
        }}
      />
      {/* крошки */}
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="absolute h-1 w-1 rounded-full"
          style={{
            left: 6 + i * 8,
            top: 5 + ((i * 7) % 10),
            background: '#8A6F55',
          }}
        />
      ))}
      <span className="absolute -right-2 -top-2 text-[0.6875rem] leading-none">🫗</span>
      {stain.cleaning && (
        <>
          <CleanProgress durationMs={stain.cleaning.durationMs} />
          {stain.cleaning.by === 'cleaner' && (
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute -top-9 left-1/2 -translate-x-1/2 text-lg">🧹</motion.span>
          )}
        </>
      )}
    </div>
  )
}

function Stains() {
  const stains = useGameStore((s) => s.stains)
  return (
    <>
      {stains.map((st) => (
        <StainView key={st.id} stain={st} />
      ))}
    </>
  )
}

// ---------- плавающие тексты ----------
function Floats() {
  const floats = useGameStore((s) => s.floats)
  return (
    <AnimatePresence>
      {floats.map((f) => (
        <div
          key={f.id}
          className={cn(
            'anim-float-up pointer-events-none absolute font-display text-sm font-extrabold',
            f.kind === 'coin' && 'text-honey',
            f.kind === 'xp' && 'text-sage',
            f.kind === 'rep-down' && 'text-berry',
          )}
          style={{
            left: isoX(f.x, f.y) + (Math.random() * 24 - 12),
            top: isoY(f.x, f.y) - 24,
            translate: '-50% -100%', // центрирование над точкой события
            zIndex: zOrder(f.x, f.y, Z.bubble),
            textShadow: '0 1px 0 rgba(92,70,51,0.3)',
          }}
        >
          {f.text}
        </div>
      ))}
    </AnimatePresence>
  )
}

// ---------- стены, пол, дверь ----------

/** Две задние стены высотой 96px + карниз/плинтус (§5.3, стены рисуются до пола).
 *  Границы — по ТЕКУЩЕМУ уровню расширения: стены перестраиваются под новый
 *  размер сразу после покупки (origin фиксирован под макс. сетку — § iso.ts,
 *  поэтому существующий зал при расширении не съезжает). */
function Walls() {
  const expansion = useGameStore((s) => s.expansion)
  const gw = gridWAt(expansion)
  const gh = hallHAt(expansion)
  // нижние кромки стен стоят РОВНО на дальних краях ромбовидного пола:
  // общий угол — верхний вертекс клетки (0,0) = iso(-0.5,-0.5);
  // левая стена идёт вдоль края y=-0.5 до правого вертекса клетки (gw-1,0),
  // правая (теневая) — вдоль края x=-0.5 до левого вертекса клетки (0,gh-1).
  const L = { x0: isoX(-0.5, -0.5), y0: isoY(-0.5, -0.5), x1: isoX(gw - 0.5, -0.5), y1: isoY(gw - 0.5, -0.5) }
  const R = { x0: isoX(-0.5, -0.5), y0: isoY(-0.5, -0.5), x1: isoX(-0.5, gh - 0.5), y1: isoY(-0.5, gh - 0.5) }
  return (
    <>
      {/* левая стена */}
      <svg className="absolute left-0 top-0" width={SCENE_W} height={SCENE_H} style={{ zIndex: 0 }} pointerEvents="none">
        <polygon
          points={`${L.x0},${L.y0 - WALL_H} ${L.x1},${L.y1 - WALL_H} ${L.x1},${L.y1} ${L.x0},${L.y0}`}
          fill="var(--wall)"
        />
        {/* плинтус */}
        <polygon
          points={`${L.x0},${L.y0 - 8} ${L.x1},${L.y1 - 8} ${L.x1},${L.y1} ${L.x0},${L.y0}`}
          fill="var(--wall-dark)"
        />
        {/* карниз */}
        <polygon
          points={`${L.x0},${L.y0 - WALL_H} ${L.x1},${L.y1 - WALL_H} ${L.x1},${L.y1 - WALL_H + 8} ${L.x0},${L.y0 - WALL_H + 8}`}
          fill="#F7ECD6"
        />
        {/* правая (теневая) стена */}
        <polygon
          points={`${R.x0},${R.y0 - WALL_H} ${R.x1},${R.y1 - WALL_H} ${R.x1},${R.y1} ${R.x0},${R.y0}`}
          fill="var(--wall-dark)"
        />
        <polygon
          points={`${R.x0},${R.y0 - 8} ${R.x1},${R.y1 - 8} ${R.x1},${R.y1} ${R.x0},${R.y0}`}
          fill="#C9B48C"
        />
        <polygon
          points={`${R.x0},${R.y0 - WALL_H} ${R.x1},${R.y1 - WALL_H} ${R.x1},${R.y1 - WALL_H + 8} ${R.x0},${R.y0 - WALL_H + 8}`}
          fill="#EBD9B8"
        />
      </svg>
    </>
  )
}

/** Пол: ромбы шахматкой по ТЕКУЩЕМУ размеру сетки (зал + кухня справа);
 *  кухня — шалфей. Новые клетки появляются сразу после покупки расширения. */
function Floor() {
  const expansion = useGameStore((s) => s.expansion)
  const hw = hallWAt(expansion)
  const hh = hallHAt(expansion)
  const tiles: ReactNode[] = []
  for (let y = 0; y < hh; y++) {
    for (let x = 0; x < hw + 3; x++) {
      const kitchen = x >= hw
      const odd = (x + y) % 2 === 1
      tiles.push(
        <Diamond
          key={`${x}-${y}`}
          x={x}
          y={y}
          bg={kitchen ? (odd ? 'var(--kitchen-tile-b)' : 'var(--kitchen-tile)') : odd ? 'var(--floor-b)' : 'var(--floor-a)'}
          style={{ transform: 'scale(0.985)' }} // шов 1px
        />,
      )
    }
  }
  return <>{tiles}</>
}

/** Стойка между залом и кухней: ПЛОСКИЕ ромбы в плоскости пола вдоль границы
 *  x = hallW−0.5/hallW (без 3D-экструзии); сдвигается вместе с шириной зала */
function Counter() {
  const expansion = useGameStore((s) => s.expansion)
  const x = hallWAt(expansion) - 0.5
  return (
    <>
      {Array.from({ length: hallHAt(expansion) }, (_, y) => (
        <Diamond
          key={y}
          x={x}
          y={y}
          bg="linear-gradient(#E2CFA6,#D9C49A)"
          style={{ transform: 'scale(0.9)', filter: 'drop-shadow(0 2px 1px rgba(92,70,51,0.18))' }}
        />
      ))}
    </>
  )
}

/**
 * Дверь: минималистичный ПРОЁМ в левой стене, нарисованный кодом (SVG, без спрайта).
 * Параллелограмм лежит в плоскости стены: основание на нижней кромке стены
 * (линия x=-0.5) у клетки входа (0,4), боковые стороны вертикальны (вверх по стене),
 * верх/низ параллельны кромке стены (наклон (256,80)→(0,208)). Коврик остаётся.
 */
function Door() {
  // Основание проёма — отрезок кромки стены между изо-точками (-0.5, 3.6) и (-0.5, 4.4)
  const ax = isoX(-0.5, 3.6) // 316.8
  const ay = isoY(-0.5, 3.6) // 273.6
  const bx = isoX(-0.5, 4.4) // 291.2
  const by = isoY(-0.5, 4.4) // 286.4
  const DH = 58 // высота проёма вверх по стене, px
  // тонкая рама — чуть шире проёма (выступ 3px вдоль стены и по вертикали)
  const fr = 3
  const ddx = ax - bx // 25.6 — шаг вдоль кромки
  const ddy = ay - by // -12.8
  const flen = Math.hypot(ddx, ddy)
  const ux = (ddx / flen) * fr // единичный вдоль кромки × выступ
  const uy = (ddy / flen) * fr
  return (
    <>
      {/* коврик у входа — ромб на клетке (0,4) */}
      <Diamond x={0} y={4} bg="rgba(217,131,91,0.35)" style={{ transform: 'scale(0.72)' }} />
      <svg
        className="pointer-events-none absolute left-0 top-0"
        width={SCENE_W}
        height={SCENE_H}
        style={{ zIndex: 1 }} // поверх стены (стены zIndex 0), под мебелью
      >
        {/* рама: тонкая окантовка чуть светлее стены */}
        <polygon
          points={`${ax + ux},${ay + uy} ${bx - ux},${by - uy} ${bx - ux},${by - DH - fr} ${ax + ux},${ay - DH - fr}`}
          fill="#F7ECD6"
        />
        {/* проём: параллелограмм в плоскости стены, темнее стены — «вырез» */}
        <polygon
          points={`${ax},${ay} ${bx},${by} ${bx},${by - DH} ${ax},${ay - DH}`}
          fill="url(#doorGrad)"
        />
        <defs>
          <linearGradient id="doorGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8A6F55" />
            <stop offset="1" stopColor="#5C4633" />
          </linearGradient>
        </defs>
        {/* внутренняя тень по верхней кромке проёма — глубина выреза */}
        <polygon
          points={`${ax},${ay - DH} ${bx},${by - DH} ${bx},${by - DH + 5} ${ax},${ay - DH + 5}`}
          fill="rgba(0,0,0,0.18)"
        />
        {/* ручка */}
        <circle cx={bx + (ax - bx) * 0.3} cy={by - DH * 0.45 + (ay - by) * 0.3} r={1.8} fill="var(--honey)" />
      </svg>
    </>
  )
}

// ---------- окружение: земля, город, зелень ----------

/**
 * Земля под всей сценой: мягкий градиент газона на ВЕСЬ новый фрейм
 * (1120×736 — никакого «пустого бежевого» фона) + песчаный апрон вокруг
 * здания ресторана и тротуара. Рисуется ПЕРВЫМ (z ниже улиц/стен/предметов).
 * Апрон строится по ТЕКУЩЕМУ размеру сетки и ряду обочины (зависят от
 * уровня расширения).
 */
function Ground() {
  const expansion = useGameStore((s) => s.expansion)
  const gw = gridWAt(expansion)
  const curb = curbRowAt(expansion)
  // апрон — параллелограмм вокруг пола и тротуара с обочиной: углы —
  // верх пола iso(-0.5,-0.5), правый iso(gw-0.5,-0.5), низ обочины
  // iso(gw-0.5,curb+0.5), левый iso(-0.5,curb+0.5); раздут на 7% от центроида
  const T: [number, number] = [isoX(-0.5, -0.5), isoY(-0.5, -0.5)]
  const R: [number, number] = [isoX(gw - 0.5, -0.5), isoY(gw - 0.5, -0.5)]
  const B: [number, number] = [isoX(gw - 0.5, curb + 0.5), isoY(gw - 0.5, curb + 0.5)]
  const L: [number, number] = [isoX(-0.5, curb + 0.5), isoY(-0.5, curb + 0.5)]
  const cx = (T[0] + R[0] + B[0] + L[0]) / 4
  const cy = (T[1] + R[1] + B[1] + L[1]) / 4
  const k = 1.07
  const apron = [T, R, B, L].map(([x, y]) => `${cx + (x - cx) * k},${cy + (y - cy) * k}`).join(' ')
  return (
    <svg className="absolute left-0 top-0" width={SCENE_W} height={SCENE_H} style={{ zIndex: 0 }} pointerEvents="none">
      <defs>
        <linearGradient id="groundGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#D5E2B4" />
          <stop offset="0.55" stopColor="#C9DAA6" />
          <stop offset="1" stopColor="#BED29A" />
        </linearGradient>
      </defs>
      {/* газон — вся сцена */}
      <rect x={0} y={0} width={SCENE_W} height={SCENE_H} fill="url(#groundGrad)" />
      {/* песчаный апрон под рестораном и тротуаром */}
      <polygon points={apron} fill="#E6D6B0" />
      <polygon points={apron} fill="none" stroke="#D8C69E" strokeWidth={2} />
    </svg>
  )
}

/** Куст: 2-3 круга зелёных оттенков на невидимой опоре; дерево: ствол + крона */
function Bush({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <g>
      <circle cx={cx - r * 0.55} cy={cy} r={r * 0.72} fill="#8FAE7C" />
      <circle cx={cx + r * 0.5} cy={cy + r * 0.12} r={r * 0.62} fill="#7C9A6B" />
      <circle cx={cx} cy={cy - r * 0.42} r={r * 0.66} fill="#A3BE8C" />
    </g>
  )
}
function Tree({ cx, cy, s }: { cx: number; cy: number; s: number }) {
  // cy — точка опоры ствола на земле
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx={s * 0.5} ry={s * 0.22} fill="rgba(92,70,51,0.15)" />
      <rect x={cx - s * 0.08} y={cy - s * 0.9} width={s * 0.16} height={s * 0.9} rx={s * 0.05} fill="#8A6F55" />
      <circle cx={cx - s * 0.3} cy={cy - s * 0.95} r={s * 0.42} fill="#8FAE7C" />
      <circle cx={cx + s * 0.28} cy={cy - s * 0.9} r={s * 0.38} fill="#7C9A6B" />
      <circle cx={cx} cy={cy - s * 1.25} r={s * 0.45} fill="#A3BE8C" />
    </g>
  )
}

/**
 * Зелень: деревья/кусты на газонах расширенной сцены — за дорогой слева,
 * среди домов за стеной, на правом газоне за рестораном, на нижнем газоне
 * под тротуаром и в нижнем левом углу (за выходом левой улицы). z ниже стен.
 */
function Greenery() {
  return (
    <svg className="absolute left-0 top-0" width={SCENE_W} height={SCENE_H} style={{ zIndex: 0 }} pointerEvents="none">
      {/* за дорогой слева (дорога рисуется позже — проходит перед зеленью) */}
      <Tree cx={245} cy={165} s={34} />
      <Bush cx={120} cy={260} r={14} />
      {/* среди домов за задней стеной */}
      <Bush cx={590} cy={106} r={11} />
      <Bush cx={985} cy={148} r={13} />
      {/* правый газон за рестораном */}
      <Tree cx={1000} cy={430} s={46} />
      <Bush cx={945} cy={505} r={15} />
      <Tree cx={1055} cy={580} s={36} />
      <Bush cx={955} cy={640} r={13} />
      {/* нижний газон под тротуаром */}
      <Bush cx={280} cy={688} r={14} />
      <Bush cx={352} cy={710} r={10} />
      <Tree cx={520} cy={698} s={34} />
      <Bush cx={700} cy={704} r={13} />
      <Bush cx={862} cy={690} r={15} />
      <Tree cx={950} cy={712} s={30} />
      {/* нижний левый угол (за выходом левой улицы) */}
      <Bush cx={82} cy={452} r={15} />
      <Tree cx={152} cy={512} s={36} />
      <Bush cx={58} cy={562} r={12} />
      <Bush cx={192} cy={592} r={11} />
    </svg>
  )
}

// ---------- улица: тротуар, обочина, прохожие ----------

/**
 * Тротуар: 2 ряда серых изо-плиток за ближним краем пола + обочина
 * (темная «дорога»). Ряды следуют за текущим размером зала (зависят от
 * уровня расширения). В расширенной сцене ряды продлены влево за угол
 * здания (x от -1) и вправо (x до 15). Рисуется ДО стен (z ниже стен),
 * клетки, упирающиеся в нижний край сцены, отрезаются: предел x+y растёт
 * на 1 за каждый добавленный расширением ряд (базово ≤ 24).
 */
function Street() {
  const expansion = useGameStore((s) => s.expansion)
  const maxXY = 24 + (hallHAt(expansion) - HALL_H)
  const tiles: ReactNode[] = []
  for (const y of [...streetRowsAt(expansion), curbRowAt(expansion)]) {
    for (let x = -1; x <= 15; x++) {
      if (x + y > maxXY) continue // за нижним краем сцены (736px)
      const curb = y === curbRowAt(expansion)
      const odd = (x + y) % 2 === 1
      tiles.push(
        <Diamond
          key={`st-${x}-${y}`}
          x={x}
          y={y}
          bg={curb ? (odd ? '#86827B' : '#8E8A82') : odd ? '#AEAAA2' : '#B9B5AD'}
          style={{ transform: 'scale(0.985)' }} // шов 1px, как у пола
        />,
      )
    }
  }
  return <>{tiles}</>
}

/**
 * Левая улица (со стороны двери): сквозная полоса тротуара + проезжей части
 * ЗА левой стеной, уходящая за верхний и за левый/нижний края сцены.
 * Геометрия строится СТРОГО по iso-формуле из мировых координат, поэтому
 * тротуар совпадает с траекторией пешеходов (линия x = PED_LANE_X):
 * ноги прохожего стоят на тротуаре, а стена (рисуется позже, z выше)
 * частично скрывает фигуру — видна над стеной, как человек за зданием.
 */
/** Мировой прямоугольник (x0..x1, y0..y1) → строка точек iso-полигона */
function isoRect(x0: number, y0: number, x1: number, y1: number): string {
  return `${isoX(x0, y0)},${isoY(x0, y0)} ${isoX(x1, y0)},${isoY(x1, y0)} ${isoX(x1, y1)},${isoY(x1, y1)} ${isoX(x0, y1)},${isoY(x0, y1)}`
}

function StreetLeft() {
  // полосы в мировых координатах (ось улицы — y, поперёк — x):
  // тротуар x∈[-4.6,-2.6] (пешеходная линия x=-3.0 лежит внутри),
  // проезжая часть x∈[-6.8,-4.6]. В расширенной сцене улица пересекает её
  // насквозь: входит через верхний край (x≈493–762) и уходит за левый.
  const Y0 = -13.0
  const Y1 = 14.5
  const walk = isoRect(-4.6, Y0, -2.6, Y1)
  const road = isoRect(-6.8, Y0, -4.6, Y1)
  // бордюры
  const curbOut = [isoX(-4.6, Y0), isoY(-4.6, Y0), isoX(-4.6, Y1), isoY(-4.6, Y1)]
  const curbIn = [isoX(-2.6, Y0), isoY(-2.6, Y0), isoX(-2.6, Y1), isoY(-2.6, Y1)]
  // осевая дороги
  const mid = [isoX(-5.7, Y0), isoY(-5.7, Y0), isoX(-5.7, Y1), isoY(-5.7, Y1)]
  // зебра у входа: полосы поперёк тротуара и дороги, на видимом участке
  // у угла стены (дальше вниз улицу перекрывает стена — там зебру не видно)
  const stripes: string[] = []
  for (let i = 0; i < 6; i++) {
    const sy = 0.5 + i * 0.26
    stripes.push(isoRect(-6.4, sy, -2.7, sy + 0.12))
  }
  return (
    <svg className="absolute left-0 top-0" width={SCENE_W} height={SCENE_H} style={{ zIndex: 0 }} pointerEvents="none">
      {/* проезжая часть (дальняя полоса, темнее) */}
      <polygon points={road} fill="#8E8A82" />
      {/* тротуар у стены (светлее) */}
      <polygon points={walk} fill="#B9B5AD" />
      {/* зебра */}
      {stripes.map((pts, i) => (
        <polygon key={i} points={pts} fill="#E8E4DC" opacity={0.85} />
      ))}
      {/* бордюры */}
      <line x1={curbOut[0]} y1={curbOut[1]} x2={curbOut[2]} y2={curbOut[3]} stroke="#D6D2CA" strokeWidth={2} />
      <line x1={curbIn[0]} y1={curbIn[1]} x2={curbIn[2]} y2={curbIn[3]} stroke="#CFC9BE" strokeWidth={1.5} />
      {/* пунктир осевой дороги */}
      <line x1={mid[0]} y1={mid[1]} x2={mid[2]} y2={mid[3]} stroke="#D6D2CA" strokeWidth={1.5} strokeDasharray="8 8" opacity={0.7} />
    </svg>
  )
}

/** Прохожий: chibi-стикер над изо-точкой тротуара (паттерн NpcFigure) */
function PedFigure({ p }: { p: Pedestrian }) {
  const peeking = p.state === 'peek'
  return (
    <motion.div
      className="pointer-events-none absolute"
      initial={{ opacity: 0 }}
      animate={{
        opacity: peeking ? 0 : 1, // «заглянул» — тает, повернувшись к двери
        left: isoX(p.x, p.y),
        top: isoY(p.x, p.y),
      }}
      transition={{
        left: { duration: 0.26, ease: 'linear' },
        top: { duration: 0.26, ease: 'linear' },
        opacity: { duration: peeking ? 1.1 : 0.35 },
      }}
      // пешеходы рендерятся ДО стен (zIndex 0, как у стен): на тротуаре видны
      // над верхней кромкой стены, а «заглянув» к двери — уходят за стену
      style={{ width: 0, height: 0, zIndex: 0 }}
    >
      {/* изо-тень под ногами */}
      <div
        className="absolute -translate-x-1/2"
        style={{
          top: 0, width: 28, height: 14,
          background: 'radial-gradient(closest-side, rgba(60,60,66,0.22), transparent 70%)',
          borderRadius: '50%',
        }}
      />
      {/* w-max — защита от схлопывания img до 0px (max-width:100% в 0-ширинном родителе) */}
      <div className="relative w-max" style={{ translate: '-50% -100%' }}>
        <div className="anim-walk-wiggle relative">
          <div style={{ transform: `scaleX(${p.facing})` }}>
            <img
              src={spriteUrl(p.sprite)}
              alt=""
              draggable={false}
              className="pointer-events-none block h-[52px] w-auto select-none"
              style={{ filter: 'drop-shadow(0 2px 1px rgba(60,60,66,0.3))' }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/** Прохожие на тротуаре (паттерн StaffFigures: подписка только на s.pedestrians) */
function Pedestrians() {
  const peds = useGameStore((s) => s.pedestrians)
  return (
    <>
      {peds.map((p) => (
        <PedFigure key={p.id} p={p} />
      ))}
    </>
  )
}

// ---------- сцена ----------

export const SCENE_SIZE = { w: SCENE_W, h: SCENE_H }

export default function Scene() {
  const items = useGameStore((s) => s.items)
  const clients = useGameStore((s) => s.clients)
  const mode = useGameStore((s) => s.mode)

  return (
    <div
      className="relative shrink-0 transition-transform duration-300"
      style={{
        width: SCENE_W,
        height: SCENE_H,
        transform: mode === 'build' ? 'scale(0.985)' : 'scale(1)',
        filter: mode === 'build' ? 'brightness(0.94)' : undefined,
      }}
    >
      <Ground />
      <Greenery />
      <Street />
      <StreetLeft />
      <Pedestrians />
      <Walls />
      <Floor />
      <Counter />
      <Door />
      {items.map((item) => (
        <PlacedItemView key={item.uid} item={item} />
      ))}
      {items.map((item) => (
        <Chairs key={`chairs-${item.uid}`} item={item} />
      ))}
      <StaffFigures />
      <Stains />
      <AnimatePresence>
        {clients.map((c) => (
          <ClientView key={c.id} client={c} />
        ))}
      </AnimatePresence>
      <Floats />
      {mode === 'build' && <BuildModeOverlay />}
    </div>
  )
}
