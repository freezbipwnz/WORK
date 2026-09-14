import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '@/game/store'
import GameButton from '@/components/ui/GameButton'

/**
 * Пошаговый онбординг (game.md §7): Tooltip/OnboardingBubble поверх сцены
 * с полупрозрачным затемнением и пульсирующим терракотовым spotlight-кругом.
 * Затемнение не перехватывает тапы — сцена остаётся живой, выход всегда
 * доступен кнопкой «Пропустить». Показывается один раз (onboardingDone).
 */

interface Step {
  emoji: string
  text: string
  /** spotlight, % viewport */
  spot: { x: number; y: number }
  /** позиция баббла на sm+, % viewport; на <480px — нижняя карточка */
  bubble: { x: number; y: number }
}

const STEPS: Step[] = [
  {
    emoji: '🏠',
    text: 'Добро пожаловать в RestoCity! Это твой ресторан. Смотри, как всё устроено.',
    spot: { x: 50, y: 38 },
    bubble: { x: 50, y: 14 },
  },
  {
    emoji: '🍕',
    text: 'Гость хочет 🍕! Нажми на плиту на кухне, чтобы приготовить заказ.',
    spot: { x: 74, y: 32 },
    bubble: { x: 50, y: 12 },
  },
  {
    emoji: '😋',
    text: 'Блюдо готово! Отнеси его гостю — кликни по блюду, потом по столу гостя.',
    spot: { x: 38, y: 40 },
    bubble: { x: 50, y: 12 },
  },
  {
    emoji: '🪙',
    text: 'Монеты! Зарабатывай их на гостях и трать в Магазине 🛒 внизу.',
    spot: { x: 14, y: 90 },
    bubble: { x: 50, y: 60 },
  },
  {
    emoji: '📜',
    text: 'Купи второй стол, чтобы сажать больше гостей — загляни в Квесты, там награды!',
    spot: { x: 34, y: 90 },
    bubble: { x: 50, y: 58 },
  },
]

/** Пульсирующий терракотовый spotlight-круг (изолирован, чтобы не дёргать родителя) */
function Spotlight({ x, y }: { x: number; y: number }) {
  return (
    <motion.div
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 320, damping: 20 }}
      className="pointer-events-none absolute z-[61]"
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      <motion.div
        animate={{ scale: [1, 1.18, 1], opacity: [0.9, 0.45, 0.9] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        className="-ml-10 -mt-10 h-20 w-20 rounded-full border-4 border-terracotta bg-terracotta/15 shadow-[0_0_24px_rgba(217,131,91,0.55)]"
      />
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-7 left-1/2 -translate-x-1/2 text-2xl"
      >
        👇
      </motion.div>
    </motion.div>
  )
}

export default function Onboarding() {
  const onboardingDone = useGameStore((s) => s.onboardingDone)
  const [step, setStep] = useState(0)

  if (onboardingDone) return null

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1
  const finish = () => useGameStore.getState().completeOnboarding()

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Затемнение вокруг spotlight — клики проходят сквозь, игра не блокируется */}
      <div className="pointer-events-none absolute inset-0 bg-cocoa/35" />

      <AnimatePresence mode="wait">
        <Spotlight key={`spot-${step}`} x={current.spot.x} y={current.spot.y} />
      </AnimatePresence>

      {/* Баббл-подсказка: на <480px — нижняя карточка (game.md §8) */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`bubble-${step}`}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.15 } }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          className="absolute z-[62] w-[300px] max-w-[calc(100vw-24px)] max-sm:!left-3 max-sm:!right-3 max-sm:!top-auto max-sm:!bottom-3 max-sm:w-auto"
          style={{ left: `${current.bubble.x}%`, top: `${current.bubble.y}%`, transform: 'translateX(-50%)' }}
        >
          <div className="flex flex-col gap-2 rounded-2xl border-2 border-cocoa/15 bg-paper p-4 shadow-panel">
            <div className="flex items-start gap-2">
              <span className="text-3xl leading-none">{current.emoji}</span>
              <p className="text-sm font-semibold leading-snug text-cocoa">
                {current.text}
              </p>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="tnum text-xs font-bold text-cocoa-soft">
                {step + 1} / {STEPS.length}
              </span>
              <GameButton
                variant={isLast ? 'buy' : 'primary'}
                onClick={() => (isLast ? finish() : setStep((s) => s + 1))}
                className="px-5"
              >
                {isLast ? 'Понятно, дальше сам 🎉' : 'Далее'}
              </GameButton>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Пропуск — мелко, справа внизу */}
      <button
        type="button"
        onClick={finish}
        className="absolute bottom-3 right-3 z-[62] min-h-[44px] rounded-xl px-3 text-xs font-bold text-paper/90 underline decoration-dotted underline-offset-4 outline-cozy max-sm:bottom-auto max-sm:top-3"
      >
        Пропустить обучение
      </button>
    </div>
  )
}
