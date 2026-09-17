import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface Props {
  icon: string
  value: number
  /** цвет акцента: honey для монет, sky для кристаллов */
  tone?: 'honey' | 'sky'
  className?: string
}

/** Пилюля валюты в HUD: flash-подсветка + count-up 400ms при изменении (design.md §7) */
export default function CurrencyChip({ icon, value, tone = 'honey', className }: Props) {
  const [shown, setShown] = useState(value)
  const [flash, setFlash] = useState(false)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (shown === value) return
    const from = shown
    const start = performance.now()
    setFlash(true)
    const t = setTimeout(() => setFlash(false), 450)
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / 400)
      setShown(Math.round(from + (value - from) * k))
      if (k < 1) rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => {
      cancelAnimationFrame(rafRef.current)
      clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <motion.div
      animate={flash ? { scale: [1, 1.08, 1] } : {}}
      className={cn(
        'flex items-center gap-1.5 rounded-full px-3 py-1.5 shadow-sticker outline-cozy',
        tone === 'honey' ? 'bg-honey/25' : 'bg-sky/25',
        flash && (tone === 'honey' ? 'bg-honey/60' : 'bg-sky/60'),
        className,
      )}
    >
      <span className="text-[1.2em] leading-none">{icon}</span>
      <span className="tnum min-w-0 truncate font-display text-lg font-extrabold text-cocoa">{shown}</span>
    </motion.div>
  )
}
