import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import TitleBar from './components/TitleBar'
import TypingPanel from './components/TypingPanel'
import ChatPanel from './components/ChatPanel'
import NotchContent from './components/NotchContent'

type WindowMode = 'expanded' | 'collapsed' | 'ghost' | 'notch'
type TypingState = 'idle' | 'capturing' | 'ready' | 'typing' | 'done'

export default function App() {
  const [windowMode, setWindowMode] = useState<WindowMode>('expanded')
  const [chatOpen, setChatOpen] = useState(false)
  const [isPinned, setIsPinned] = useState(true)
  const [isTransparent, setIsTransparent] = useState(false)
  const [transferredText, setTransferredText] = useState<string | undefined>()
  const [notchExpanded, setNotchExpanded] = useState(false)
  const [notchTypingState, setNotchTypingState] = useState<TypingState>('idle')
  const [notchProgress, setNotchProgress] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Mouse tracking for selective click-through
  useEffect(() => {
    if (isTransparent) {
      // Transparency mode: start fully click-through, only TitleBar zone (top 36px) is interactive
      window.electronAPI?.setIgnoreMouseEvents(true)
      const handleMove = (e: MouseEvent) => {
        window.electronAPI?.setIgnoreMouseEvents(e.clientY > 36)
      }
      window.addEventListener('mousemove', handleMove)
      return () => {
        window.removeEventListener('mousemove', handleMove)
        window.electronAPI?.setIgnoreMouseEvents(false)
      }
    }
    // Normal mode: selective based on interactive elements
    const handleMove = (e: MouseEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY)
      const isInteractive =
        el?.closest('[data-interactive]') !== null ||
        el?.closest('.drag-region') !== null ||
        el?.closest('button') !== null ||
        el?.closest('textarea') !== null ||
        el?.closest('input') !== null ||
        el?.closest('a') !== null
      window.electronAPI?.setIgnoreMouseEvents(!isInteractive)
    }
    window.addEventListener('mousemove', handleMove)
    return () => window.removeEventListener('mousemove', handleMove)
  }, [isTransparent])

  // Snap-to-top events from main process
  useEffect(() => {
    const unsubNotch = window.electronAPI?.onSnapToNotch?.(() => {
      setWindowMode('notch')
      setNotchExpanded(false)
    })
    return () => unsubNotch?.()
  }, [])

  // Notch hover events from main process
  useEffect(() => {
    const unsubHover = window.electronAPI?.onNotchHover?.(() => {
      setNotchExpanded(true)
    })
    const unsubUnhover = window.electronAPI?.onNotchUnhover?.(() => {
      setNotchExpanded(false)
    })
    return () => {
      unsubHover?.()
      unsubUnhover?.()
    }
  }, [])

  const handleTogglePin = useCallback(async () => {
    const pinned = await window.electronAPI?.togglePin()
    setIsPinned(pinned)
  }, [])

  const handleToggleTransparency = useCallback(() => {
    const next = !isTransparent
    setIsTransparent(next)
    window.electronAPI?.setTransparency(next)
  }, [isTransparent])

  const handleUseText = useCallback((text: string) => {
    setTransferredText(text)
    setChatOpen(false)
  }, [])

  const handleTypingStateChange = useCallback((state: TypingState, progress: number) => {
    setNotchTypingState(state)
    setNotchProgress(progress)
  }, [])

  // Width/height for collapsed/ghost/notch — expanded uses '100%' to fill the window
  const getAnimateWidth = () => {
    if (windowMode === 'expanded') return '100%'
    if (windowMode === 'collapsed') return 260
    if (windowMode === 'notch') return 260
    return 200 // ghost
  }

  const getAnimateHeight = () => {
    if (windowMode === 'expanded') return '100%'
    if (windowMode === 'collapsed') return 44
    if (windowMode === 'notch') return notchExpanded ? 44 : 8
    return 6 // ghost
  }

  const getBorderRadius = () => {
    if (windowMode === 'ghost') return 0
    if (windowMode === 'collapsed') return 999
    if (windowMode === 'notch') return notchExpanded ? 22 : 999
    return 'var(--radius-lg)'
  }

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
          className={`glass${isTransparent ? ' glass--no-blur' : ''}`}
          style={{
            borderRadius: getBorderRadius(),
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
          }}
          animate={{
            width: getAnimateWidth(),
            height: getAnimateHeight(),
          }}
          transition={{
            type: 'spring',
            stiffness: windowMode === 'notch' ? 500 : 380,
            damping: windowMode === 'notch' ? 35 : 32,
          }}
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
              <DraggablePill
                onExpand={() => {
                  setWindowMode('expanded')
                  window.electronAPI?.setWindowMode('expanded')
                }}
              />
            )}

            {windowMode === 'notch' && (
              <NotchContent
                expanded={notchExpanded}
                typingState={notchTypingState}
                progress={notchProgress}
                onExpand={() => {
                  setWindowMode('expanded')
                  window.electronAPI?.setWindowMode('expanded')
                }}
              />
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
                  isTransparent={isTransparent}
                  onToggleTransparency={handleToggleTransparency}
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
                    onTypingStateChange={handleTypingStateChange}
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
                    style={{ borderRadius: 'var(--radius-sm)', width: 36, height: 36, gap: 5 }}
                  >
                    <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
                      <path d="M1 2h10v7H7l-2 2V9H1V2z" stroke="currentColor" strokeWidth="1.1" fill="none" strokeLinejoin="round"/>
                    </svg>
                    <span style={{ fontSize: 10, fontWeight: 500 }}>Chat</span>
                  </button>

                  <div
                    data-interactive
                    className="drag-region"
                    title="Arrastrar para mover"
                    style={{
                      width: 28,
                      height: 28,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'grab',
                      color: 'var(--text-muted)',
                      opacity: 0.5,
                    }}
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                      <circle cx="3" cy="3" r="1"/><circle cx="7" cy="3" r="1"/>
                      <circle cx="3" cy="7" r="1"/><circle cx="7" cy="7" r="1"/>
                    </svg>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </LayoutGroup>
    </div>
  )
}

function DraggablePill({ onExpand }: { onExpand: () => void }) {
  const dragging = useRef(false)
  const moved = useRef(false)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = true
    moved.current = false
    const startMouseX = e.screenX
    const startMouseY = e.screenY
    const startWinX = window.screenX
    const startWinY = window.screenY

    const onMove = (me: MouseEvent) => {
      const dx = me.screenX - startMouseX
      const dy = me.screenY - startMouseY
      if (!moved.current && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
        moved.current = true
      }
      if (moved.current) {
        window.electronAPI?.moveWindow(startWinX + dx, startWinY + dy)
      }
    }

    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      dragging.current = false
      if (!moved.current) onExpand()
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [onExpand])

  return (
    <motion.div
      key="collapsed"
      data-interactive
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ delay: 0.1 }}
      onMouseDown={handleMouseDown}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'grab',
        gap: 6,
        userSelect: 'none',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--text-muted)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          pointerEvents: 'none',
        }}
      >
        Flytext
      </span>
    </motion.div>
  )
}
