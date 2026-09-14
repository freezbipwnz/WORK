import type { ReactNode } from 'react'

/**
 * Каркас игрового кадра (design.md §6): экран зафиксирован в viewport (100dvh),
 * без скролла страницы. Жёсткие зоны — CSS Grid в .game-frame (index.css).
 * Pattern A: Layout рендерит {children} (см. react-dev.md).
 */
export default function Layout({ children }: { children: ReactNode }) {
  return <div className="game-frame">{children}</div>
}
