import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '@/game/store'
import TabBar, { type TabId } from './ui/TabBar'
import GameButton from './ui/GameButton'
import ShopPanel from './panels/ShopPanel'
import StaffPanel from './panels/StaffPanel'
import QuestsPanel from './panels/QuestsPanel'
import { cn } from '@/lib/utils'

/**
 * Нижняя таб-панель (game.md §4): шапка [табы | 🔨 Расстановка] В ПОТОКЕ
 * (никаких FAB/absolute поверх табов), контент активного таба со скроллом.
 * Телефон портрет — bottom-sheet: свёрнут до шапки, тап по табу раскрывает
 * (CSS-классы .panel-root/.panel-header/.panel-content, см. index.css).
 * Ландшафт телефона — правая колонка (grid каркаса в index.css).
 */
export default function TabPanelSlot() {
  const [tab, setTab] = useState<TabId>('shop')
  const [expanded, setExpanded] = useState(false)
  const mode = useGameStore((s) => s.mode)
  const questsBadge = useGameStore((s) =>
    s.quests.some((q) => !q.claimed && q.progress >= q.target),
  )

  const onTab = (t: TabId) => {
    if (t === tab) setExpanded((v) => !v) // повторный тап — свернуть/развернуть sheet
    else {
      setTab(t)
      setExpanded(true)
    }
  }

  return (
    <motion.footer
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 26, delay: 0.15 }}
      className={cn(
        'panel-root flex min-h-0 flex-col gap-2 rounded-2xl bg-paper p-2 shadow-panel sm:p-3',
        expanded && 'panel-expanded',
      )}
    >
      {/* Шапка панели: табы слева, кнопка «🔨 Расстановка» — слот справа, в потоке */}
      <div className="panel-header flex items-center gap-2">
        <div className="panel-tabs flex min-w-0 flex-1 gap-2 overflow-x-auto">
          <TabBar active={tab} onChange={onTab} questsBadge={questsBadge} />
        </div>
        <GameButton
          variant={mode === 'build' ? 'buy' : 'primary'}
          className="shrink-0 px-3 text-sm sm:px-5 sm:text-base"
          onClick={() => {
            const st = useGameStore.getState()
            if (st.mode === 'build') st.exitBuildMode()
            else st.enterBuildMode()
          }}
        >
          {mode === 'build' ? '▶ В игру' : '🔨 Расстановка'}
        </GameButton>
      </div>

      {/* Контент активного таба (внутренний скролл) */}
      <div className="panel-content min-h-0 flex-1 overflow-hidden rounded-xl bg-cream/60 p-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ x: 12, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -12, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {tab === 'shop' && <ShopPanel />}
            {tab === 'staff' && <StaffPanel />}
            {tab === 'quests' && <QuestsPanel />}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.footer>
  )
}
