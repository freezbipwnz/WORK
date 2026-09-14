import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'buy' | 'destructive' | 'ghost'

interface Props {
  variant?: Variant
  disabled?: boolean
  onClick?: () => void
  className?: string
  children: ReactNode
  /** Показать цену; при нехватке — перечёркнутая berry */
  price?: number
  canAfford?: boolean
}

const VARIANT_CLS: Record<Variant, string> = {
  primary: 'bg-terracotta hover:bg-terracotta-deep text-paper',
  buy: 'bg-sage text-paper hover:brightness-95',
  destructive: 'bg-berry text-paper hover:brightness-95',
  ghost: 'bg-paper text-cocoa hover:bg-wall',
}

/** Кнопка игры (design.md §7): rounded-12, Baloo 2 700, squish-tap, плоская тень */
export default function GameButton({
  variant = 'primary',
  disabled,
  onClick,
  className,
  children,
  price,
  canAfford = true,
}: Props) {
  const isDisabled = disabled || (price !== undefined && !canAfford)
  return (
    <motion.button
      type="button"
      whileTap={isDisabled ? undefined : { scale: 0.94 }}
      whileHover={isDisabled ? undefined : { scale: 1.03 }}
      transition={{ type: 'spring', stiffness: 500, damping: 20 }}
      disabled={isDisabled}
      onClick={onClick}
      className={cn(
        'font-display min-h-[44px] rounded-xl px-4 py-2 text-[15px] font-bold',
        'shadow-sticker outline-cozy inline-flex items-center justify-center gap-1.5',
        isDisabled ? 'cursor-not-allowed bg-[#CFC4B2] text-cocoa-soft' : VARIANT_CLS[variant],
        className,
      )}
    >
      {children}
      {price !== undefined && (
        <span
          className={cn(
            'tnum',
            !canAfford && 'text-berry line-through',
          )}
        >
          {price} 🪙
        </span>
      )}
    </motion.button>
  )
}
