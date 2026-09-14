import { memo } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '@/game/store'
import { DOOR, HALL_H, HALL_W, getItem } from '@/game/catalog'
import { isoX, isoY, zOrder, Z, SCENE_W, SCENE_H, WALL_H, TILE_W, TILE_H } from '@/game/iso'
import type { Client, PlacedItem } from '@/game/types'
import { cn } from '@/lib/utils'
import { CUSTOMER_SPRITES, DISH_SPRITES, DOOR_SPRITE, ITEM_SPRITES, STAFF_SPRITES, customerSprite, spriteUrl } from './sprites'
import BuildModeOverlay from './BuildMode'

const DIAMOND = 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)'

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
          top: cy - useH + 8,
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

/** Головы сидящих клиентов вокруг стола */
function SeatedHeads({ clients }: { clients: Client[] }) {
  const offsets: [number, number][] = [
    [-26, 4],
    [26, 4],
    [-14, -18],
    [14, -18],
  ]
  return (
    <>
      {clients.slice(0, 4).map((c, i) =>
        CUSTOMER_SPRITES.length ? (
          <img
            key={c.id}
            src={spriteUrl(customerSprite(c.id))}
            alt=""
            draggable={false}
            className="pointer-events-none absolute block h-auto select-none"
            style={{
              left: `calc(50% + ${offsets[i][0] - 12}px)`,
              bottom: 8 + offsets[i][1] * -1 + 14,
              width: 24,
              filter: 'drop-shadow(0 1px 0 rgba(92,70,51,0.3))',
            }}
          />
        ) : (
          <span
            key={c.id}
            className="absolute text-lg leading-none"
            style={{
              left: `calc(50% + ${offsets[i][0] - 9}px)`,
              bottom: 8 + offsets[i][1] * -1 + 18,
              filter: 'drop-shadow(0 1px 0 rgba(92,70,51,0.3))',
            }}
          >
            {c.phase === 'eating' ? '😍' : c.face}
          </span>
        ),
      )}
    </>
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

/** Круговой таймер готовки */
function CookTimer({ startedAt, duration }: { startedAt: number; duration: number }) {
  const elapsed = (Date.now() - startedAt) / 1000
  const pct = Math.min(1, elapsed / duration)
  return (
    <svg className="absolute -right-2 -top-5 h-5 w-5 -rotate-90" viewBox="0 0 20 20">
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
        <Sticker x={item.x} y={item.y} platform="#C9B18C" emoji="🪑" emojiSize={40} onClick={onClick} title={def.name}>
          <Tabletop bg="#D9B382" w={48} />
          {eatingClient && (
            <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-lg">
              {DISH_SPRITES[eatingClient.order] ? (
                <img src={spriteUrl(DISH_SPRITES[eatingClient.order])} alt="" draggable={false} className="pointer-events-none h-6 w-6 select-none object-contain" />
              ) : (
                eatingClient.order
              )}
            </span>
          )}
          <SeatedHeads clients={seated} />
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
          <SeatedHeads clients={seated} />
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
        <Sticker x={item.x} y={item.y} platform="#D9C49A" emoji="🔪" emojiSize={44} title={def.name} />
      )
    case 'fridge':
      return (
        <Sticker x={item.x} y={item.y} platform="#C4CFD2" emoji="🧊" emojiSize={46} title={def.name} />
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
            top: WALL_H - 56,
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

// ---------- персонажи ----------

const ClientView = memo(function ClientView({ client }: { client: Client }) {
  const moving = client.phase === 'arriving' || client.phase === 'leaving' || client.phase === 'angry-leaving'
  const bubble =
    client.phase === 'seated'
      ? useGameStore.getState().kitchenJobs.some((j) => j.clientId === client.id)
        ? '⏳'
        : client.order
      : client.phase === 'eating'
        ? '😍'
        : client.phase === 'angry-leaving'
          ? '😡'
          : client.phase === 'leaving'
            ? '😍'
            : null

  const cx = isoX(client.x, client.y)
  const cy = isoY(client.x, client.y)

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
        left: { duration: 0.12, ease: 'linear' },
        top: { duration: 0.12, ease: 'linear' },
        scale: { type: 'spring', stiffness: 400, damping: 15 },
      }}
      style={{ width: 0, height: 0, zIndex: zOrder(client.x, client.y, Z.character) }}
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
      <div className={cn('relative -translate-x-1/2 -translate-y-full', moving ? 'anim-walk-wiggle' : 'anim-bounce-idle')}>
        {bubble && (
          <div
            className="anim-bubble-bob absolute left-1/2 -translate-x-1/2 rounded-xl bg-paper px-1.5 py-0.5 text-sm shadow-sticker outline-cozy"
            style={{ top: -46, zIndex: Z.bubble }}
          >
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
                  style={{ width: `${(client.patience / 30) * 100}%` }}
                />
              </div>
            )}
          </div>
        )}
        {CUSTOMER_SPRITES.length ? (
          <img
            src={spriteUrl(customerSprite(client.id))}
            alt=""
            draggable={false}
            className="pointer-events-none block h-auto w-11 select-none"
            style={{ filter: 'drop-shadow(0 2px 1px rgba(92,70,51,0.3))' }}
          />
        ) : (
          <span
            className="inline-block text-[34px] leading-none"
            style={{ filter: 'drop-shadow(0 2px 1px rgba(92,70,51,0.3))' }}
          >
            {client.phase === 'angry-leaving' ? '😠' : client.phase === 'eating' ? '😍' : client.face}
          </span>
        )}
      </div>
    </motion.div>
  )
})

/** Статичные chibi-фигуры персонала */
function StaffFigures() {
  const staff = useGameStore((s) => s.staff)
  const items = useGameStore((s) => s.items)
  const cooking = useGameStore((s) => s.kitchenJobs.some((j) => !j.ready))
  const stove = items.find((i) => getItem(i.itemId)?.isStove)
  const figures: { emoji: string; sprite?: string; x: number; y: number; active?: boolean }[] = []
  if (staff.some((m) => m.role === 'cook') && stove) {
    figures.push({ emoji: '👨‍🍳', sprite: STAFF_SPRITES.cook, x: stove.x, y: stove.y + 1, active: cooking })
  }
  if (staff.some((m) => m.role === 'waiter')) {
    figures.push({ emoji: '🤵', sprite: STAFF_SPRITES.waiter, x: Math.floor(HALL_W / 2), y: HALL_H - 1 })
  }
  if (staff.some((m) => m.role === 'cleaner')) {
    figures.push({ emoji: '🧹', sprite: STAFF_SPRITES.cleaner, x: 1, y: HALL_H - 1 })
  }
  return (
    <>
      {figures.map((f) => (
        <motion.div
          key={f.emoji}
          className="pointer-events-none absolute text-2xl"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          style={{
            left: isoX(f.x, f.y) - (f.sprite ? 20 : 12),
            top: isoY(f.x, f.y) - (f.sprite ? 46 : 30),
            zIndex: zOrder(f.x, f.y, Z.character),
          }}
        >
          {f.sprite ? (
            <img
              src={spriteUrl(f.sprite)}
              alt=""
              draggable={false}
              style={{ width: 40, filter: 'drop-shadow(0 2px 1px rgba(92,70,51,0.3))' }}
              className={cn(
                'pointer-events-none block h-auto select-none',
                f.active ? 'anim-walk-wiggle' : 'anim-bounce-idle',
              )}
            />
          ) : (
            <span className={f.active ? 'inline-block anim-walk-wiggle' : 'inline-block anim-bounce-idle'}>{f.emoji}</span>
          )}
        </motion.div>
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

/** Две задние стены высотой 96px + карниз/плинтус (§5.3, стены рисуются до пола) */
function Walls() {
  // левая стена (за рядом y=0, вдоль оси x до кухни включительно)
  const L = { x0: 224, y0: WALL_H, x1: 672, y1: WALL_H + 192 } // нижняя кромка
  // правая стена (за колонкой x=0) — теневая грань
  const R = { x0: 224, y0: WALL_H, x1: 0, y1: WALL_H + 112 }
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

/** Пол: 13×8 ромбов шахматкой; кухня — шалфей */
function Floor() {
  const tiles: ReactNode[] = []
  for (let y = 0; y < HALL_H; y++) {
    for (let x = 0; x < HALL_W + 3; x++) {
      const kitchen = x >= HALL_W
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

/** Стойка между залом и кухней: низкий изо-блок-полоса вдоль границы x=9/10 */
function Counter() {
  // параллелограмм вдоль линии от правого вертекса (9,0) до левого вертекса (10,7)
  return (
    <>
      <svg className="pointer-events-none absolute left-0 top-0" width={SCENE_W} height={SCENE_H} style={{ zIndex: zOrder(9.5, 0, Z.object) }}>
        {Array.from({ length: HALL_H }, (_, y) => {
          const cx = isoX(9.5, y)
          const cy = isoY(9.5, y)
          return (
            <g key={y}>
              <polygon
                points={`${cx},${cy - 8} ${cx + 16},${cy} ${cx},${cy + 8} ${cx - 16},${cy}`}
                fill="#D9C49A"
              />
              <polygon points={`${cx - 16},${cy} ${cx},${cy + 8} ${cx},${cy + 16} ${cx - 16},${cy + 8}`} fill="#C4AF83" />
              <polygon points={`${cx + 16},${cy} ${cx},${cy + 8} ${cx},${cy + 16} ${cx + 16},${cy + 8}`} fill="#B09B72" />
            </g>
          )
        })}
      </svg>
      <span
        className="pointer-events-none absolute rounded-full bg-paper p-0.5 text-xs shadow-sticker"
        style={{ left: isoX(9.5, 3) - 10, top: isoY(9.5, 3) - 26, zIndex: zOrder(9.5, 3, Z.bubble) }}
      >
        🍳
      </span>
    </>
  )
}

/** Дверь: арка-проём у переднего левого края пола (клетка (0,4), спавн DOOR=(-1,4)) + коврик */
function Door() {
  // точка стоянки арки — внешняя кромка пола у клетки (0,4)
  const cx = isoX(-1, 4)
  const cy = isoY(-1, 4)
  return (
    <>
      {/* коврик у входа — ромб на клетке (0,4) */}
      <Diamond x={0} y={4} bg="rgba(217,131,91,0.35)" style={{ transform: 'scale(0.72)' }} />
      {/* арка-дверь: спрайт стоит на полу у края, без парящих объектов */}
      {DOOR_SPRITE ? (
        <img
          src={spriteUrl(DOOR_SPRITE)}
          alt="Вход"
          draggable={false}
          className="pointer-events-none absolute block h-auto select-none"
          style={{
            left: cx - 30,
            top: cy - 78,
            width: 60,
            zIndex: zOrder(0, 4, Z.object - 1),
            filter: 'drop-shadow(0 3px 2px rgba(92,70,51,0.25))',
          }}
        />
      ) : (
        <div
          className="pointer-events-none absolute"
          style={{ left: cx - 22, top: cy - 60, width: 44, height: 66, zIndex: zOrder(0, 4, Z.object - 1) }}
        >
          {/* рама арки */}
          <div
            className="absolute inset-0"
            style={{
              background: 'var(--wall)',
              border: '2px solid rgba(92,70,51,0.35)',
              borderRadius: '22px 22px 3px 3px',
              boxShadow: 'inset 0 3px 0 rgba(255,255,255,0.5)',
            }}
          />
          {/* тёмный проём */}
          <div
            className="absolute"
            style={{
              left: 8, right: 8, top: 12, bottom: 2,
              background: 'linear-gradient(#8A6F55,#5C4633)',
              borderRadius: '13px 13px 2px 2px',
            }}
          />
          {/* ручка */}
          <span
            className="absolute rounded-full"
            style={{ right: 12, top: 38, width: 4, height: 4, background: 'var(--honey)' }}
          />
          {/* табличка */}
          <span className="absolute left-1/2 top-0.5 -translate-x-1/2 text-[10px] leading-none">☕</span>
        </div>
      )}
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
      <Walls />
      <Floor />
      <Counter />
      <Door />
      {items.map((item) => (
        <PlacedItemView key={item.uid} item={item} />
      ))}
      <StaffFigures />
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
