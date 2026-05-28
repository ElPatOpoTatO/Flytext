import { useState } from 'react'
import { motion } from 'framer-motion'

interface TitleBarProps {
  isPinned: boolean
  onTogglePin: () => void
  onMinimize: () => void
  onClose: () => void
  mode: 'expanded' | 'collapsed'
  isTransparent: boolean
  onToggleTransparency: () => void
}

export default function TitleBar({
  isPinned,
  onTogglePin,
  onMinimize,
  onClose,
  mode,
  isTransparent,
  onToggleTransparency,
}: TitleBarProps) {
  const [hovered, setHovered] = useState(false)

  if (mode === 'collapsed') return null

  return (
    <div
      className="drag-region"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px 6px',
        height: 36,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* App name */}
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          fontWeight: 500,
          color: 'var(--text-muted)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}
      >
        Flytext
      </span>

      {/* Controls */}
      <motion.div
        className="no-drag"
        style={{ display: 'flex', gap: 4 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: hovered ? 1 : 0 }}
        transition={{ duration: 0.12 }}
      >
        <WindowBtn
          onClick={onTogglePin}
          title={isPinned ? 'Unpin' : 'Pin on top'}
          active={isPinned}
          color="var(--accent)"
        >
          <PinIcon />
        </WindowBtn>
        <WindowBtn
          onClick={onToggleTransparency}
          title={isTransparent ? 'Modo opaco' : 'Modo transparencia'}
          active={isTransparent}
          color="var(--accent2)"
        >
          <TransparencyIcon />
        </WindowBtn>
        <WindowBtn onClick={onMinimize} title="Minimize">
          <MinusIcon />
        </WindowBtn>
        <WindowBtn onClick={onClose} title="Close" color="#c87171">
          <XIcon />
        </WindowBtn>
      </motion.div>
    </div>
  )
}

function WindowBtn({
  children,
  onClick,
  title,
  active,
  color = 'var(--text-muted)',
}: {
  children: React.ReactNode
  onClick: () => void
  title: string
  active?: boolean
  color?: string
}) {
  return (
    <button
      className="window-btn"
      onClick={onClick}
      title={title}
      style={{
        width: 22,
        height: 22,
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border)',
        background: active ? 'var(--accent-dim)' : 'transparent',
        color: active ? color : 'var(--text-muted)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'background 80ms, color 80ms',
        padding: 0,
      }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLButtonElement).style.background =
          active ? 'var(--accent-dim)' : 'var(--bg-elevated)'
        ;(e.currentTarget as HTMLButtonElement).style.color = color
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLButtonElement).style.background = active
          ? 'var(--accent-dim)'
          : 'transparent'
        ;(e.currentTarget as HTMLButtonElement).style.color = active
          ? color
          : 'var(--text-muted)'
      }}
    >
      {children}
    </button>
  )
}

function TransparencyIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <rect x="1" y="3" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1" fill="currentColor" fillOpacity="0.3"/>
      <rect x="4" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1" fill="none"/>
    </svg>
  )
}

function PinIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path d="M5 1L6.5 3.5H8.5L7 5.5L7.5 8.5L5 7L2.5 8.5L3 5.5L1.5 3.5H3.5L5 1Z" stroke="currentColor" strokeWidth="1" fill="none"/>
    </svg>
  )
}

function MinusIcon() {
  return (
    <svg width="8" height="2" viewBox="0 0 8 2" fill="none">
      <path d="M1 1H7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  )
}

function XIcon() {
  return (
    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
      <path d="M1 1L7 7M7 1L1 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  )
}
