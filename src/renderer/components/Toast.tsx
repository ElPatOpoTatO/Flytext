import { useEffect, useRef, useState } from 'react'

interface ToastProps {
  id: string
  message: string
  onDismiss: (id: string) => void
}

export interface ToastItem {
  id: string
  message: string
}

interface ToastStackProps {
  toasts: ToastItem[]
  onDismiss: (id: string) => void
}

function Toast({ id, message, onDismiss }: ToastProps) {
  const [phase, setPhase] = useState<'entering' | 'visible' | 'exiting'>('entering')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Next frame: switch to visible
    const frameId = requestAnimationFrame(() => setPhase('visible'))

    // Auto-dismiss after 3 s
    timerRef.current = setTimeout(() => {
      setPhase('exiting')
      setTimeout(() => onDismiss(id), 160)
    }, 3000)

    return () => {
      cancelAnimationFrame(frameId)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [id, onDismiss])

  return (
    <div className={`toast toast-${phase}`}>
      {/* Warning SVG icon — no emoji per design-taste-frontend anti-emoji rule */}
      <svg className="toast-icon" width="11" height="11" viewBox="0 0 11 11" fill="none">
        <path
          d="M5.5 1L10 9.5H1L5.5 1Z"
          stroke="currentColor"
          strokeWidth="1.1"
          strokeLinejoin="round"
        />
        <path d="M5.5 4.5V6.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
        <circle cx="5.5" cy="8" r="0.6" fill="currentColor" />
      </svg>
      <span>{message}</span>
    </div>
  )
}

export function ToastStack({ toasts, onDismiss }: ToastStackProps) {
  if (toasts.length === 0) return null
  return (
    <div className="toast-stack">
      {toasts.map((t) => (
        <Toast key={t.id} id={t.id} message={t.message} onDismiss={onDismiss} />
      ))}
    </div>
  )
}
