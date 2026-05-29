import { useCallback, useRef } from 'react'
import { motion } from 'framer-motion'

type TypingState = 'idle' | 'capturing' | 'ready' | 'typing' | 'done'

interface NotchContentProps {
  expanded: boolean
  typingState: TypingState
  progress: number
  onExpand: () => void
}

export default function NotchContent({ expanded, typingState, progress, onExpand }: NotchContentProps) {
  const dragging = useRef(false)
  const moved = useRef(false)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = true
    moved.current = false
    const startMouseX = e.screenX
    const startWinX = window.screenX

    const onMove = (me: MouseEvent) => {
      const dx = me.screenX - startMouseX
      if (!moved.current && Math.abs(dx) > 4) moved.current = true
      if (moved.current) {
        window.electronAPI?.moveWindow(startWinX + dx, 0)
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
      key="notch"
      data-interactive
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.1 }}
      onMouseDown={handleMouseDown}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: expanded ? 'grab' : 'ew-resize',
        overflow: 'hidden',
        gap: 6,
        userSelect: 'none',
      }}
    >
      {expanded ? (
        typingState === 'typing' ? (
          <>
            <div className="dot-live" style={{ flexShrink: 0 }} />
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--text-muted)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                pointerEvents: 'none',
                flexShrink: 0,
              }}
            >
              Escribiendo
            </span>
            <div className="progress-bar" style={{ width: 48, flexShrink: 0 }}>
              <div className="progress-fill" style={{ transform: `scaleX(${progress})` }} />
            </div>
          </>
        ) : (
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
        )
      ) : (
        typingState === 'typing' ? (
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              width: `${progress * 100}%`,
              height: 2,
              background: 'var(--accent)',
              borderRadius: 1,
              boxShadow: '0 0 4px var(--accent-glow)',
            }}
          />
        ) : (
          <div
            style={{
              width: 4,
              height: 4,
              borderRadius: '50%',
              background: 'var(--accent)',
              boxShadow: '0 0 6px var(--accent-glow)',
              opacity: 0.6,
            }}
          />
        )
      )}
    </motion.div>
  )
}
