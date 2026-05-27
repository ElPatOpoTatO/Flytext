import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import SpeedSlider from './SpeedSlider'
import HumanConfigPanel from './HumanConfig'
import { typeText, HumanConfig, DEFAULT_HUMAN_CONFIG } from '../services/typingEngine'

declare global {
  interface Window {
    electronAPI: {
      minimize: () => void
      close: () => void
      togglePin: () => Promise<boolean>
      setWindowMode: (mode: string) => void
      setIgnoreMouseEvents: (ignore: boolean) => void
      startCapture: () => void
      onPositionCaptured: (cb: (pos: { x: number; y: number }) => void) => () => void
      onCaptureCancelled: (cb: () => void) => () => void
      showMarker: (pos: { x: number; y: number }) => void
      hideMarker: () => void
      typeChar: (char: string) => Promise<void>
      typeBackspace: () => Promise<void>
      moveMouse: (pos: { x: number; y: number }) => Promise<void>
      clickMouse: () => Promise<void>
      getPlatform: () => string
    }
  }
}

type TypingState = 'idle' | 'capturing' | 'ready' | 'typing' | 'done'

interface TypingPanelProps {
  onTransferToChat: (text: string) => void
  transferredText?: string
  onTransferConsumed: () => void
}

export default function TypingPanel({
  transferredText,
  onTransferConsumed,
}: TypingPanelProps) {
  const [text, setText] = useState('')
  const [speed, setSpeed] = useState(40)
  const [humanConfig, setHumanConfig] = useState<HumanConfig>(DEFAULT_HUMAN_CONFIG)
  const [typingState, setTypingState] = useState<TypingState>('idle')
  const [typedCount, setTypedCount] = useState(0)
  const [configOpen, setConfigOpen] = useState(false)
  const [targetPos, setTargetPos] = useState<{ x: number; y: number } | null>(null)
  const [isPinned, setIsPinned] = useState(true)

  const abortRef = useRef<AbortController | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Accept text from chat
  useEffect(() => {
    if (transferredText) {
      setText(transferredText)
      onTransferConsumed()
      textareaRef.current?.focus()
    }
  }, [transferredText, onTransferConsumed])

  // Listen for position capture events
  useEffect(() => {
    const unsubCapture = window.electronAPI.onPositionCaptured((pos) => {
      setTargetPos(pos)
      setTypingState('ready')
      window.electronAPI.showMarker(pos)
      window.electronAPI.setWindowMode('expanded')
    })
    const unsubCancel = window.electronAPI.onCaptureCancelled(() => {
      setTypingState('idle')
      window.electronAPI.setWindowMode('expanded')
    })
    return () => { unsubCapture(); unsubCancel() }
  }, [])

  const handleStartCapture = useCallback(() => {
    setTypingState('capturing')
    window.electronAPI.setWindowMode('collapsed')
    window.electronAPI.startCapture()
  }, [])

  const handleStart = useCallback(async () => {
    if (!text.trim() || typingState === 'typing') return

    const ctrl = new AbortController()
    abortRef.current = ctrl
    setTypedCount(0)
    setTypingState('typing')
    window.electronAPI.setWindowMode('collapsed')
    window.electronAPI.setIgnoreMouseEvents(true)

    // Move mouse to target and click to focus
    if (targetPos) {
      await window.electronAPI.moveMouse(targetPos)
      await new Promise((r) => setTimeout(r, 80))
      await window.electronAPI.clickMouse()
      await new Promise((r) => setTimeout(r, 60))
    }

    try {
      await typeText(
        text,
        speed,
        humanConfig,
        (count) => setTypedCount(count),
        ctrl.signal,
        {
          typeChar: (c) => window.electronAPI.typeChar(c),
          typeBackspace: () => window.electronAPI.typeBackspace(),
        },
      )
    } finally {
      setTypingState(ctrl.signal.aborted ? 'idle' : 'done')
      window.electronAPI.setIgnoreMouseEvents(false)
      window.electronAPI.setWindowMode('expanded')
    }
  }, [text, speed, humanConfig, typingState, targetPos])

  const handleStop = useCallback(() => {
    abortRef.current?.abort()
    window.electronAPI.setIgnoreMouseEvents(false)
    window.electronAPI.setWindowMode('expanded')
    setTypingState('idle')
  }, [])

  const handleReset = useCallback(() => {
    setTypingState('idle')
    setTypedCount(0)
    setTargetPos(null)
    window.electronAPI.hideMarker()
  }, [])

  const handleTogglePin = useCallback(async () => {
    const pinned = await window.electronAPI.togglePin()
    setIsPinned(pinned)
  }, [])

  const progress = text.length > 0 ? typedCount / text.length : 0

  // Collapsed / typing mode — pill UI
  if (typingState === 'typing' || typingState === 'capturing') {
    return (
      <div
        data-interactive
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 14px',
          height: 44,
          gap: 12,
        }}
      >
        <div className="pill-status">
          {typingState === 'capturing' ? (
            <>
              <span style={{ color: 'var(--accent2)' }}>◎</span>
              <span>Click para fijar posición...</span>
            </>
          ) : (
            <>
              <div className="dot-live" />
              <span>Escribiendo</span>
              <span style={{ color: 'var(--text-ghost)' }}>
                {typedCount}/{text.length}
              </span>
            </>
          )}
        </div>

        {typingState === 'typing' && (
          <>
            <div className="progress-bar" style={{ flex: 1 }}>
              <div
                className="progress-fill"
                style={{ transform: `scaleX(${progress})` }}
              />
            </div>
            <button
              data-interactive
              className="btn btn-danger"
              onClick={handleStop}
              style={{ flexShrink: 0, fontSize: 11, padding: '4px 10px' }}
            >
              Stop
            </button>
          </>
        )}
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Textarea with typed overlay */}
      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        {typingState === 'done' || (typingState === 'idle' && typedCount > 0) ? (
          <TypedOverlay text={text} typedCount={typedCount} />
        ) : (
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => { setText(e.target.value); setTypedCount(0) }}
            placeholder="Pega el texto a escribir..."
            className="no-drag"
            style={{
              width: '100%',
              height: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              resize: 'none',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              lineHeight: 1.6,
              padding: '0 16px',
              caretColor: 'var(--accent)',
            }}
          />
        )}
      </div>

      {/* Controls */}
      <div
        style={{
          padding: '10px 16px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          borderTop: '1px solid var(--border)',
        }}
      >
        <SpeedSlider value={speed} onChange={setSpeed} />

        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {/* Config button */}
          <button
            data-interactive
            className="btn btn-icon"
            onClick={() => setConfigOpen(true)}
            title="Configuración humana"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M6 1v1.5M6 9.5V11M1 6h1.5M9.5 6H11M2.4 2.4l1.1 1.1M8.5 8.5l1.1 1.1M9.6 2.4L8.5 3.5M3.5 8.5L2.4 9.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </button>

          {/* Pin button */}
          <button
            data-interactive
            className={`btn btn-icon ${isPinned ? 'btn-accent active' : ''}`}
            onClick={handleTogglePin}
            title={isPinned ? 'Desfijar' : 'Fijar encima'}
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M5.5 1L7 4H10L8 6.5L8.5 10L5.5 8L2.5 10L3 6.5L1 4H4L5.5 1Z" stroke="currentColor" strokeWidth="1.1" fill={isPinned ? 'currentColor' : 'none'}/>
            </svg>
          </button>

          <div style={{ flex: 1 }} />

          {/* Position button */}
          <AnimatePresence mode="wait">
            {targetPos ? (
              <motion.button
                key="pos-set"
                data-interactive
                className="btn"
                onClick={handleStartCapture}
                style={{ fontSize: 11, color: 'var(--accent)', borderColor: 'var(--accent-dim)' }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <circle cx="5" cy="5" r="2" stroke="currentColor" strokeWidth="1.2"/>
                  <path d="M5 1v1.5M5 7.5V9M1 5h1.5M7.5 5H9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
                Refijar
              </motion.button>
            ) : (
              <motion.button
                key="pos-empty"
                data-interactive
                className="btn"
                onClick={handleStartCapture}
                style={{ fontSize: 11 }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <circle cx="5" cy="5" r="2" stroke="currentColor" strokeWidth="1.2"/>
                  <path d="M5 1v1.5M5 7.5V9M1 5h1.5M7.5 5H9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
                Fijar posición
              </motion.button>
            )}
          </AnimatePresence>

          {/* Start/Reset button */}
          <AnimatePresence mode="wait">
            {typingState === 'done' ? (
              <motion.button
                key="reset"
                data-interactive
                className="btn"
                onClick={handleReset}
                style={{ fontSize: 11 }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                Nuevo
              </motion.button>
            ) : (
              <motion.button
                key="start"
                data-interactive
                className={`btn btn-accent ${text.trim() ? '' : 'opacity-50'}`}
                onClick={handleStart}
                disabled={!text.trim() || !targetPos}
                title={!targetPos ? 'Primero fija la posición' : ''}
                style={{ fontSize: 11 }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <svg width="8" height="10" viewBox="0 0 8 10" fill="currentColor">
                  <path d="M0 0L8 5L0 10V0Z"/>
                </svg>
                Iniciar
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Human config sheet */}
      <HumanConfigPanel
        open={configOpen}
        config={humanConfig}
        onChange={setHumanConfig}
        onClose={() => setConfigOpen(false)}
      />
    </div>
  )
}

function TypedOverlay({ text, typedCount }: { text: string; typedCount: number }) {
  return (
    <div
      className="typing-display no-drag"
      style={{ padding: '0 16px', height: '100%', overflowY: 'auto' }}
    >
      {text.split('').map((char, i) => {
        const cls =
          i < typedCount ? 'char-typed' : i === typedCount ? 'char-current' : 'char-pending'
        if (char === '\n') return <br key={i} />
        return <span key={i} className={cls}>{char}</span>
      })}
    </div>
  )
}
