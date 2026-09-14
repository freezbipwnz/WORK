import { useEffect, useState } from 'react'
import { useGameStore } from '@/game/store'
import { isoX, isoY, Z, zOrder } from '@/game/iso'

/**
 * Оверлей «кушает 🍽»: прогресс-бар трапезы (ровно 15с) над каждым клиентом
 * в фазе eating. Рисуется отдельным слоем поверх Scene (Scene.tsx не трогаем),
 * координаты — те же iso-проекции, что у персонажей.
 */
export default function EatingBars() {
  const clients = useGameStore((s) => s.clients)
  const eaters = clients.filter((c) => c.phase === 'eating' && c.eatStart !== undefined && c.eatEnd !== undefined)

  // прогресс — по реальному времени: тикаем 4 раза в секунду, пока есть едоки
  const [, setBeat] = useState(0)
  useEffect(() => {
    if (!eaters.length) return
    const id = setInterval(() => setBeat((b) => b + 1), 250)
    return () => clearInterval(id)
  }, [eaters.length])

  if (!eaters.length) return null
  const now = Date.now()

  return (
    <div className="pointer-events-none absolute inset-0" style={{ zIndex: Z.bubble }}>
      {eaters.map((c) => {
        const total = Math.max(1, (c.eatEnd ?? 0) - (c.eatStart ?? 0))
        const pct = Math.min(1, Math.max(0, (now - (c.eatStart ?? 0)) / total))
        return (
          <div
            key={c.id}
            className="absolute flex w-9 -translate-x-1/2 flex-col items-center gap-0.5"
            style={{
              left: isoX(c.x, c.y),
              top: isoY(c.x, c.y) - 78,
              zIndex: zOrder(c.x, c.y, Z.bubble),
            }}
          >
            <span className="text-[11px] leading-none drop-shadow">🍽</span>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-cocoa/25 outline-cozy">
              <div
                className="h-full rounded-full bg-sage transition-[width] duration-200 ease-linear"
                style={{ width: `${pct * 100}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
