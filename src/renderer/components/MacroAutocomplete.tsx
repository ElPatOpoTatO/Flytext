import { forwardRef, useImperativeHandle, useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { MACRO_NAMES, MACRO_DISPLAY } from '../services/macroParser'

interface MacroAutocompleteProps {
  open: boolean
  filter: string
  onSelect: (name: string) => void
  onClose: () => void
}

export interface MacroAutocompleteHandle {
  handleKeyDown: (e: React.KeyboardEvent) => boolean
}

const MacroAutocomplete = forwardRef<MacroAutocompleteHandle, MacroAutocompleteProps>(
  ({ open, filter, onSelect, onClose }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0)

    const filtered = MACRO_NAMES.filter((n) =>
      n.startsWith(filter.toLowerCase()),
    )

    useEffect(() => {
      setSelectedIndex(0)
    }, [filter])

    useImperativeHandle(ref, () => ({
      handleKeyDown(e: React.KeyboardEvent): boolean {
        if (!open || filtered.length === 0) return false
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1))
          return true
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          setSelectedIndex((i) => Math.max(i - 1, 0))
          return true
        }
        if (e.key === 'Enter' || e.key === 'Tab') {
          e.preventDefault()
          onSelect(filtered[selectedIndex])
          return true
        }
        if (e.key === 'Escape') {
          onClose()
          return true
        }
        return false
      },
    }))

    return (
      <AnimatePresence>
        {open && filtered.length > 0 && (
          <motion.div
            className="macro-autocomplete no-drag"
            data-interactive
            initial={{ opacity: 0, scale: 0.95, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 4 }}
            transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
            style={{ transformOrigin: 'bottom left' }}
          >
            {filtered.map((name, i) => (
              <motion.div
                key={name}
                className={`macro-ac-item ${i === selectedIndex ? 'selected' : ''}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                onMouseDown={(e) => {
                  e.preventDefault() // prevent textarea blur
                  onSelect(name)
                }}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                <span className="macro-ac-name">{`{{${name}}}`}</span>
                <span className="macro-ac-hint">{MACRO_DISPLAY[name] ?? ''}</span>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    )
  },
)

MacroAutocomplete.displayName = 'MacroAutocomplete'
export default MacroAutocomplete
