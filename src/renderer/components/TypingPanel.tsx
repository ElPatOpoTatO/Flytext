import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import SpeedSlider from './SpeedSlider'
import HumanConfigPanel from './HumanConfig'
import MacroAutocomplete, { MacroAutocompleteHandle } from './MacroAutocomplete'
import { ToastStack, ToastItem } from './Toast'
import { typeText, HumanConfig, DEFAULT_HUMAN_CONFIG } from '../services/typingEngine'
import { parseMacros } from '../services/macroParser'

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
      pressCombo: (sendKeys: string) => Promise<void>
      moveMouse: (pos: { x: number; y: number }) => Promise<void>
      clickMouse: () => Promise<void>
      unpin: () => Promise<void>
      setTransparency: (on: boolean) => Promise<void>
      onSnapToCollapsed: (cb: () => void) => () => void
      onSnapToNotch: (cb: () => void) => () => void
      onNotchHover: (cb: () => void) => () => void
      onNotchUnhover: (cb: () => void) => () => void
      moveWindow: (x: number, y: number) => void
      getPlatform: () => string
    }
  }
}

type TypingState = 'idle' | 'capturing' | 'ready' | 'typing' | 'done'

interface TypingPanelProps {
  onTransferToChat: (text: string) => void
  transferredText?: string
  onTransferConsumed: () => void
  onTypingStateChange?: (state: TypingState, progress: number) => void
}

export default function TypingPanel({
  transferredText,
  onTransferConsumed,
  onTypingStateChange,
}: TypingPanelProps) {
  const [text, setText] = useState('')
  const [speed, setSpeed] = useState(40)
  const [humanConfig, setHumanConfig] = useState<HumanConfig>(DEFAULT_HUMAN_CONFIG)
  const [typingState, setTypingState] = useState<TypingState>('idle')
  const [typedCount, setTypedCount] = useState(0)
  const [configOpen, setConfigOpen] = useState(false)
  const [targetPos, setTargetPos] = useState<{ x: number; y: number } | null>(null)
  const [isPinned, setIsPinned] = useState(true)
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [macroACOpen, setMacroACOpen] = useState(false)
  const [macroACFilter, setMacroACFilter] = useState('')

  const [textAreaHeight, setTextAreaHeight] = useState<number | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const macroACRef = useRef<MacroAutocompleteHandle>(null)
  const textAreaRef = useRef<HTMLDivElement>(null)

  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const startY = e.clientY
    const startHeight = textAreaRef.current?.offsetHeight ?? 200

    const onMove = (me: MouseEvent) => {
      const dy = me.clientY - startY
      setTextAreaHeight(Math.max(48, startHeight + dy))
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [])

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

  const handleDismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const handleMacroSkip = useCallback((raw: string) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, message: `Macro desconocido: ${raw}` }])
  }, [])

  const handleStart = useCallback(async () => {
    if (!text.trim() || typingState === 'typing') return

    const ctrl = new AbortController()
    abortRef.current = ctrl
    setTypedCount(0)
    setTypingState('typing')
    window.electronAPI.setWindowMode('collapsed')
    window.electronAPI.setIgnoreMouseEvents(true)

    // Auto-click at target position if enabled
    if (targetPos && humanConfig.autoClick) {
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
          pressCombo: (sk) => window.electronAPI.pressCombo(sk),
        },
        handleMacroSkip,
      )
    } finally {
      setTypingState(ctrl.signal.aborted ? 'idle' : 'done')
      window.electronAPI.setIgnoreMouseEvents(false)
      window.electronAPI.setWindowMode('expanded')
      // Unpin when typing completes naturally (not stopped by user)
      if (!ctrl.signal.aborted) {
        window.electronAPI.unpin()
        setIsPinned(false)
      }
    }
  }, [text, speed, humanConfig, typingState, targetPos, handleMacroSkip])

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

  // Textarea change — detect {{ trigger for macro autocomplete
  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value
      setText(val)
      setTypedCount(0)

      if (humanConfig.macrosEnabled) {
        const before = val.slice(0, e.target.selectionStart)
        const match = before.match(/\{\{([^}]*)$/)
        if (match) {
          setMacroACFilter(match[1])
          setMacroACOpen(true)
        } else {
          setMacroACOpen(false)
        }
      }
    },
    [humanConfig.macrosEnabled],
  )

  // Textarea keydown — forward to autocomplete first
  const handleTextKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (macroACOpen && macroACRef.current) {
        const handled = macroACRef.current.handleKeyDown(e)
        if (handled) return
      }
    },
    [macroACOpen],
  )

  // Macro selected from autocomplete
  const handleMacroSelect = useCallback(
    (name: string) => {
      const el = textareaRef.current
      if (!el) return
      const sel = el.selectionStart
      const before = text.slice(0, sel)
      const match = before.match(/\{\{([^}]*)$/)
      if (!match) return
      const start = sel - match[1].length
      const newText = text.slice(0, start) + name + '}}' + text.slice(sel)
      setText(newText)
      setMacroACOpen(false)
      requestAnimationFrame(() => {
        el.selectionStart = start + name.length + 2
        el.selectionEnd = start + name.length + 2
      })
    },
    [text],
  )

  const progress = text.length > 0 ? typedCount / text.length : 0

  // Notify parent of typing state changes for notch display
  useEffect(() => {
    onTypingStateChange?.(typingState, progress)
  }, [typingState, progress, onTypingStateChange])

  // Collapsed / typing mode — pill UI
  if (typingState === 'typing' || typingState === 'capturing') {
    return (
      <div
        data-interactive
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
          height: 36,
          gap: 10,
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
      {/* Textarea with typed overlay + macro autocomplete */}
      <div
        ref={textAreaRef}
        style={textAreaHeight !== null
          ? { height: textAreaHeight, flexShrink: 0, position: 'relative', minHeight: 0 }
          : { flex: 1, position: 'relative', minHeight: 0 }
        }
      >
        {typingState === 'done' || (typingState === 'idle' && typedCount > 0) ? (
          <TypedOverlay
            text={text}
            typedCount={typedCount}
            macrosEnabled={humanConfig.macrosEnabled}
          />
        ) : (
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleTextKeyDown}
            placeholder="Pega el texto a escribir..."
            className="no-drag typing-textarea"
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
              padding: '8px 12px',
              caretColor: 'var(--accent)',
            }}
          />
        )}

        {humanConfig.macrosEnabled && (
          <MacroAutocomplete
            ref={macroACRef}
            open={macroACOpen}
            filter={macroACFilter}
            onSelect={handleMacroSelect}
            onClose={() => setMacroACOpen(false)}
          />
        )}
      </div>

      {/* Resize handle */}
      <div
        data-interactive
        onMouseDown={handleDividerMouseDown}
        style={{
          height: 5,
          flexShrink: 0,
          cursor: 'ns-resize',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderTop: '1px solid var(--border)',
          background: 'transparent',
          transition: 'background 80ms',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-surface)' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
      >
        <div style={{ width: 24, height: 2, borderRadius: 1, background: 'var(--border)' }} />
      </div>

      {/* Controls */}
      <div
        style={{
          padding: '7px 12px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <SpeedSlider value={speed} onChange={setSpeed} />

        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
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
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                  <circle cx="7.5" cy="7.5" r="3" stroke="currentColor" strokeWidth="1.1"/>
                  <circle cx="7.5" cy="7.5" r="1" fill="currentColor"/>
                  <path d="M1 1L4.2 6.8L5.8 5.2L7.5 8.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Cambiar objetivo
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
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                  <circle cx="7.5" cy="7.5" r="3" stroke="currentColor" strokeWidth="1.1"/>
                  <circle cx="7.5" cy="7.5" r="1" fill="currentColor"/>
                  <path d="M1 1L4.2 6.8L5.8 5.2L7.5 8.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Elegir objetivo
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
                style={{ fontSize: 11, padding: '6px 16px' }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <svg width="8" height="10" viewBox="0 0 8 10" fill="currentColor">
                  <path d="M0 0L8 5L0 10V0Z"/>
                </svg>
                Escribir
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

      {/* Toast notifications for unknown macros */}
      <ToastStack toasts={toasts} onDismiss={handleDismissToast} />
    </div>
  )
}

function TypedOverlay({
  text,
  typedCount,
  macrosEnabled,
}: {
  text: string
  typedCount: number
  macrosEnabled: boolean
}) {
  // Build per-character token type map for error marking
  const tokens = parseMacros(text, macrosEnabled)
  const charMeta: Array<'text' | 'macro' | 'unknown-macro' | 'pause'> = []
  for (const token of tokens) {
    if (token.type === 'text') {
      for (let i = 0; i < token.chars.length; i++) charMeta.push('text')
    } else {
      // macro, unknown-macro, pause all have a raw string in the original text
      const raw = token.type === 'pause'
        ? text.match(/\{\{pause:\d+\}\}/)?.[0] ?? ''
        : token.raw
      for (let i = 0; i < raw.length; i++) charMeta.push(token.type)
    }
  }

  return (
    <div
      className="typing-display no-drag"
      style={{ padding: '0 16px', height: '100%', overflowY: 'auto' }}
    >
      {text.split('').map((char, i) => {
        const meta = charMeta[i] ?? 'text'
        let cls: string

        if (meta === 'unknown-macro') {
          cls = 'char-macro-error'
        } else if (i < typedCount) {
          cls = 'char-typed'
        } else if (i === typedCount) {
          cls = 'char-current'
        } else {
          cls = 'char-pending'
        }

        if (char === '\n') return <br key={i} />
        return <span key={i} className={cls}>{char}</span>
      })}
    </div>
  )
}
