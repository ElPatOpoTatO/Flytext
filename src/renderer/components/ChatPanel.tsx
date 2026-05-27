import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { streamChat } from '../services/openaiService'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
}

interface ChatPanelProps {
  onUseText: (text: string) => void
  open: boolean
}

export default function ChatPanel({ onUseText, open }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('openai_key') || '')
  const [apiKeyOpen, setApiKeyOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const saveApiKey = useCallback((key: string) => {
    setApiKey(key)
    localStorage.setItem('openai_key', key)
  }, [])

  const handleSend = useCallback(async () => {
    if (!input.trim() || loading) return
    if (!apiKey) { setApiKeyOpen(true); return }

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input }
    const assistantId = (Date.now() + 1).toString()
    const assistantMsg: Message = { id: assistantId, role: 'assistant', content: '', streaming: true }

    setMessages((prev) => [...prev, userMsg, assistantMsg])
    setInput('')
    setLoading(true)

    const history = [...messages, userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }))

    try {
      let accumulated = ''
      for await (const chunk of streamChat(history, apiKey)) {
        accumulated += chunk
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: accumulated } : m,
          ),
        )
      }
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, streaming: false } : m,
        ),
      )
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: `Error: ${message}`, streaming: false }
            : m,
        ),
      )
    } finally {
      setLoading(false)
    }
  }, [input, loading, apiKey, messages])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            background: 'rgba(13, 13, 16, 0.97)',
            borderRadius: 'inherit',
            zIndex: 5,
            overflow: 'hidden',
          }}
        >
          {/* Messages */}
          <div
            className="no-drag"
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {messages.length === 0 && (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-ghost)',
                  fontSize: 12,
                  fontFamily: 'var(--font-mono)',
                  textAlign: 'center',
                  lineHeight: 1.6,
                }}
              >
                Pide mejoras, traducciones<br />o reformateos de texto
              </div>
            )}
            {messages.map((msg, i) => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                index={i}
                onUse={onUseText}
              />
            ))}
            <div ref={bottomRef} />
          </div>

          {/* API key banner */}
          <AnimatePresence>
            {apiKeyOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                style={{
                  overflow: 'hidden',
                  borderTop: '1px solid var(--border)',
                  padding: '10px 14px',
                  display: 'flex',
                  gap: 8,
                  alignItems: 'center',
                }}
              >
                <input
                  type="password"
                  placeholder="sk-..."
                  defaultValue={apiKey}
                  onBlur={(e) => saveApiKey(e.target.value)}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '5px 10px',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    outline: 'none',
                  }}
                />
                <button
                  className="btn btn-accent"
                  onClick={() => setApiKeyOpen(false)}
                  style={{ fontSize: 11, padding: '5px 10px' }}
                >
                  Guardar
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input */}
          <div
            style={{
              padding: '10px 14px 12px',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              gap: 6,
              alignItems: 'flex-end',
            }}
          >
            <button
              data-interactive
              className="btn btn-icon"
              onClick={() => setApiKeyOpen((v) => !v)}
              title="API Key"
              style={{ flexShrink: 0 }}
            >
              <svg width="10" height="12" viewBox="0 0 10 12" fill="none">
                <path d="M5 1C3.34 1 2 2.34 2 4c0 1.11.61 2.07 1.5 2.6V7h-1v2h1v2h2V9h1V7h-1V6.6C6.39 6.07 7 5.11 7 4c0-1.66-1.34-3-2-3z" stroke="currentColor" strokeWidth="1.1" fill="none"/>
              </svg>
            </button>

            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder="Escribe un mensaje..."
              className="no-drag"
              rows={1}
              style={{
                flex: 1,
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '7px 10px',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-sans)',
                fontSize: 12,
                outline: 'none',
                resize: 'none',
                maxHeight: 80,
                lineHeight: 1.4,
              }}
            />

            <button
              data-interactive
              className={`btn btn-accent ${loading ? 'opacity-50' : ''}`}
              onClick={handleSend}
              disabled={loading || !input.trim()}
              style={{ flexShrink: 0, fontSize: 11, padding: '7px 12px' }}
            >
              {loading ? '...' : 'Enviar'}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function MessageBubble({
  msg,
  index,
  onUse,
}: {
  msg: Message
  index: number
  onUse: (t: string) => void
}) {
  const isAssistant = msg.role === 'assistant'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isAssistant ? 'flex-start' : 'flex-end',
        gap: 4,
      }}
    >
      <div className={isAssistant ? 'bubble-assistant' : 'bubble-user'}>
        {msg.content}
        {msg.streaming && (
          <span
            style={{
              display: 'inline-block',
              width: 6,
              height: 12,
              background: 'var(--accent)',
              marginLeft: 2,
              verticalAlign: 'text-bottom',
              animation: 'cursor-blink 0.53s steps(1) infinite',
            }}
          />
        )}
      </div>
      {isAssistant && !msg.streaming && msg.content && (
        <button
          data-interactive
          className="btn"
          onClick={() => onUse(msg.content)}
          style={{ fontSize: 10, padding: '3px 8px', color: 'var(--accent)' }}
        >
          → Usar
        </button>
      )}
    </motion.div>
  )
}
