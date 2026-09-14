import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '@/game/store'
import type { GameStore } from '@/game/store'
import GameButton from '@/components/ui/GameButton'

interface TutorialStep {
  emoji: string
  title: string
  text: string
  /** Условие автоперехода: true — шаг выполнен действием игрока */
  done: (s: GameStore) => boolean
}

const STEPS: TutorialStep[] = [
  {
    emoji: '🍳',
    title: 'Приготовь блюдо',
    text: 'Гость сел за стол и ждёт заказ. Нажми на плиту на кухне, чтобы начать готовить.',
    done: (s) => s.stats.dishesCooked > 0,
  },
  {
    emoji: '🍽️',
    title: 'Подай блюдо',
    text: 'Когда блюдо готово — нажми на него на плите, а затем на стол гостя, чтобы подать.',
    done: (s) => s.stats.servedClients > 0,
  },
  {
    emoji: '🪑',
    title: 'Купи второй стол',
    text: 'Открой вкладку «Магазин» внизу и купи ещё один стол — гостей станет больше.',
    done: (s) => s.stats.tablesBought > 0,
  },
  {
    emoji: '🤵',
    title: 'Найми официанта',
    text: 'Во вкладке «Персонал» найми официанта — он сам будет носить готовые блюда.',
    done: (s) => s.staff.some((m) => m.role === 'waiter'),
  },
  {
    emoji: '📜',
    title: 'Загляни в квесты',
    text: 'Во вкладке «Квесты» тебя ждут награды за развитие ресторана: монеты, опыт и кристаллы!',
    done: () => false, // финальный шаг — закрывается кнопкой «Готово»
  },
]

/**
 * Текстовое обучение новичка: карточка внизу сцены (не перекрывает игру,
 * safe-area), без стрелок/подсветок. Шаги продвигаются действием игрока
 * (слушаем стор) или кнопкой «Далее»; «Пропустить» завершает обучение.
 * Показывается один раз (persist-флаг tutorialDone; старые сейвы → true).
 */
export default function Tutorial() {
  const onboardingDone = useGameStore((s) => s.onboardingDone)
  const tutorialDone = useGameStore((s) => s.tutorialDone)
  const [step, setStep] = useState(0)

  const visible = onboardingDone && !tutorialDone
  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  // автопереход: условие текущего шага выполнилось — ждём чуть-чуть и идём дальше
  const stepDone = useGameStore((s) => (visible && current ? current.done(s) : false))
  useEffect(() => {
    if (!stepDone || isLast) return
    const id = setTimeout(() => setStep((v) => Math.min(v + 1, STEPS.length - 1)), 900)
    return () => clearTimeout(id)
  }, [stepDone, isLast])

  const finish = () => useGameStore.getState().completeTutorial()

  return (
    <AnimatePresence>
      {visible && current && (
        <motion.div
          key={step}
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 12, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[55] flex justify-center px-3"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 10px)' }}
        >
          <div className="pointer-events-auto w-full max-w-[420px] rounded-2xl border-2 border-cocoa/15 bg-paper p-3 shadow-panel">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cream text-2xl">
                {current.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-display text-[15px] font-extrabold text-cocoa">
                    {current.title}
                  </h3>
                  <span className="tnum shrink-0 text-[11px] font-semibold text-cocoa-soft">
                    {step + 1}/{STEPS.length}
                  </span>
                </div>
                <p className="mt-0.5 text-xs font-semibold leading-snug text-cocoa-soft">
                  {current.text}
                </p>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-end gap-2">
              <GameButton variant="ghost" onClick={finish} className="px-3">
                Пропустить
              </GameButton>
              {isLast ? (
                <GameButton variant="buy" onClick={finish} className="px-4">
                  Готово 🎉
                </GameButton>
              ) : (
                <GameButton
                  variant="buy"
                  onClick={() => setStep((v) => Math.min(v + 1, STEPS.length - 1))}
                  className="px-4"
                >
                  Далее
                </GameButton>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
