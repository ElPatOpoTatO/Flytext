import { motion, AnimatePresence } from 'framer-motion'
import { HumanConfig } from '../services/typingEngine'

interface HumanConfigPanelProps {
  open: boolean
  config: HumanConfig
  onChange: (c: HumanConfig) => void
  onClose: () => void
}

export default function HumanConfigPanel({
  open,
  config,
  onChange,
  onClose,
}: HumanConfigPanelProps) {
  const set = <K extends keyof HumanConfig>(key: K, value: HumanConfig[K]) =>
    onChange({ ...config, [key]: value })

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.4)',
              zIndex: 10,
              borderRadius: 'inherit',
            }}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
              padding: '20px 18px 22px',
              zIndex: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 18,
              background: 'rgba(18, 18, 22, 0.96)',
              borderTop: '1px solid var(--border)',
            }}
          >
            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: -8 }}>
              <div style={{ width: 28, height: 3, borderRadius: 2, background: 'var(--border)' }} />
            </div>

            <Row label="Errores de tipeo">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                <input
                  type="range" min={0} max={30} value={config.typoRate}
                  onChange={(e) => set('typoRate', Number(e.target.value))}
                  style={{ flex: 1 }}
                />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)', minWidth: 24, textAlign: 'right' }}>
                  {config.typoRate}%
                </span>
              </div>
            </Row>

            <Row label="Auto-corregir errores">
              <Toggle
                checked={config.autocorrect}
                onChange={(v) => set('autocorrect', v)}
              />
            </Row>

            <Row label="Velocidad de corrección">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                <input
                  type="range" min={0} max={100} value={config.correctionDelay}
                  onChange={(e) => set('correctionDelay', Number(e.target.value))}
                  disabled={!config.autocorrect}
                  style={{ flex: 1, opacity: config.autocorrect ? 1 : 0.35 }}
                />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)', minWidth: 24, textAlign: 'right' }}>
                  {config.correctionDelay}
                </span>
              </div>
            </Row>

            <Row label="Ráfagas de velocidad">
              <Toggle
                checked={config.burstSpeed}
                onChange={(v) => set('burstSpeed', v)}
              />
            </Row>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'flex-end' }}>
        {children}
      </div>
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle" style={{ cursor: 'pointer' }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div className="toggle-track" />
      <div className="toggle-thumb" />
    </label>
  )
}
