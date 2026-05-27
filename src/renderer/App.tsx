import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import TitleBar from './components/TitleBar'
import TypingPanel from './components/TypingPanel'
import ChatPanel from './components/ChatPanel'

type WindowMode = 'expanded' | 'collapsed' | 'ghost'

export default function App() {
  const [windowMode, setWindowMode] = useState<WindowMode>('expanded')
  const [chatOpen, setChatOpen] = useState(false)
  const [isPinned, setIsPinned] = useState(true)
  const [transferredText, setTransferredText] = useState<string | undefined>()
  const containerRef = useRef<HTMLDivElement>(null)

  // Mouse tracking for selective click-through
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY)
      const isInteractive = el?.closest('[data-interactive]') !== null || el?.closest('button') !== null || el?.closest('textarea') !== null || el?.closest('input') !== null || el?.closest('a') !== null
      window.electronAPI?.setIgnoreMouseEvents(!isInteractive)
    }
    window.addEventListener('mousemove', handleMove)
    return () => window.removeEventListener('mousemove', handleMove)
  }, [])

  const handleTogglePin = useCallback(async () => {
    const pinned = await window.electronAPI?.togglePin()
    setIsPinned(pinned)
  }, [])

  const handleUseText = useCallback((text: string) => {
    setTransferredText(text)
    setChatOpen(false)
  }, [])

  // Height based on window mode
  const containerHeight = windowMode === 'expanded' ? 560 : windowMode === 'collapsed' ? 44 : 6
  const showContent = windowMode === 'expanded'

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: 0,
        background: 'transparent',
      }}
    >
      <LayoutGroup>
        <motion.div
          ref={containerRef}
          layout
          layoutId="notch"
          className="glass"
          style={{
            borderRadius: windowMode === 'ghost' ? 0 : windowMode === 'collapsed' ? 999 : 'var(--radius-lg)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
          }}
          animate={{
            width: windowMode === 'expanded' ? 440 : windowMode === 'collapsed' ? 260 : 200,
            height: containerHeight,
          }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        >
          <AnimatePresence mode="wait">
            {windowMode === 'ghost' && (
              <motion.div
                key="ghost"
                data-interactive
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  setWindowMode('collapsed')
                  window.electronAPI?.setWindowMode('collapsed')
                }}
                style={{
                  width: '100%',
                  height: '100%',
                  cursor: 'n-resize',
                  background: 'rgba(212,149,106,0.08)',
                }}
              />
            )}

            {windowMode === 'collapsed' && (
              <motion.div
                key="collapsed"
                data-interactive
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.1 }}
                onClick={() => {
                  setWindowMode('expanded')
                  window.electronAPI?.setWindowMode('expanded')
                }}
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  gap: 6,
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  Flytext
                </span>
              </motion.div>
            )}

            {showContent && (
              <motion.div
                key="expanded"
                initial={{ opacity: 0, filter: 'blur(4px)' }}
                animate={{ opacity: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, filter: 'blur(4px)' }}
                transition={{ delay: 0.12, duration: 0.18 }}
                style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}
              >
                {/* Title bar */}
                <TitleBar
                  isPinned={isPinned}
                  mode="expanded"
                  onTogglePin={handleTogglePin}
                  onMinimize={() => window.electronAPI?.minimize()}
                  onClose={() => window.electronAPI?.close()}
                />

                {/* Main content */}
                <div style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 0 }}>
                  <TypingPanel
                    onTransferToChat={(text) => {
                      setTransferredText(text)
                      setChatOpen(true)
                    }}
                    transferredText={transferredText}
                    onTransferConsumed={() => setTransferredText(undefined)}
                  />

                  <ChatPanel
                    open={chatOpen}
                    onUseText={handleUseText}
                  />
                </div>

                {/* Bottom bar */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 14px 8px',
                    borderTop: '1px solid var(--border)',
                  }}
                >
                  <button
                    data-interactive
                    className={`btn btn-icon ${chatOpen ? 'btn-accent active' : ''}`}
                    onClick={() => setChatOpen((v) => !v)}
                    title="Chat IA"
                    style={{ borderRadius: 'var(--radius-sm)' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M1 2h10v7H7l-2 2V9H1V2z" stroke="currentColor" strokeWidth="1.1" fill="none" strokeLinejoin="round"/>
                    </svg>
                  </button>

                  <button
                    data-interactive
                    className="btn btn-icon"
                    onClick={() => {
                      setWindowMode('collapsed')
                      window.electronAPI?.setWindowMode('collapsed')
                    }}
                    title="Colapsar"
                  >
                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                      <path d="M1 5L5 1L9 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </LayoutGroup>
    </div>
  )
}
