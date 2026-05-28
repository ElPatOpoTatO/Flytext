export type Token =
  | { type: 'text'; chars: string[] }
  | { type: 'macro'; sendKeys: string; raw: string }
  | { type: 'unknown-macro'; raw: string }
  | { type: 'pause'; ms: number }

// SendKeys modifier syntax: ^ = Ctrl, + = Shift, % = Alt
export const MACRO_MAP: Record<string, string> = {
  'ctrl+a':       '^a',
  'ctrl+b':       '^b',
  'ctrl+c':       '^c',
  'ctrl+i':       '^i',
  'ctrl+u':       '^u',
  'ctrl+v':       '^v',
  'ctrl+x':       '^x',
  'ctrl+z':       '^z',
  'ctrl+shift+z': '^+z',
  'shift+enter':  '+{ENTER}',
  'tab':          '{TAB}',
  'enter':        '{ENTER}',
  'esc':          '{ESC}',
  'backspace':    '{BACKSPACE}',
}

export const MACRO_DISPLAY: Record<string, string> = {
  'ctrl+b':       'Negrita',
  'ctrl+i':       'Cursiva',
  'ctrl+u':       'Subrayado',
  'ctrl+z':       'Deshacer',
  'ctrl+shift+z': 'Rehacer',
  'ctrl+a':       'Sel. todo',
  'ctrl+c':       'Copiar',
  'ctrl+v':       'Pegar',
  'ctrl+x':       'Cortar',
  'shift+enter':  'Nueva línea',
  'tab':          'Tab',
  'enter':        'Enter',
  'esc':          'Escape',
  'backspace':    'Borrar',
}

export const MACRO_NAMES: string[] = Object.keys(MACRO_MAP)

export function parseMacros(text: string, macrosEnabled: boolean): Token[] {
  if (!macrosEnabled) {
    return [{ type: 'text', chars: [...text] }]
  }

  const tokens: Token[] = []
  const regex = /\{\{([^}]+)\}\}/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', chars: [...text.slice(lastIndex, match.index)] })
    }

    const inner = match[1].trim().toLowerCase()
    const raw = match[0]

    if (inner.startsWith('pause:')) {
      const ms = parseInt(inner.slice(6), 10)
      tokens.push({ type: 'pause', ms: isNaN(ms) ? 0 : Math.max(0, ms) })
    } else if (MACRO_MAP[inner] !== undefined) {
      tokens.push({ type: 'macro', sendKeys: MACRO_MAP[inner], raw })
    } else {
      tokens.push({ type: 'unknown-macro', raw })
    }

    lastIndex = match.index + raw.length
  }

  if (lastIndex < text.length) {
    tokens.push({ type: 'text', chars: [...text.slice(lastIndex)] })
  }

  return tokens.length === 0 ? [{ type: 'text', chars: [...text] }] : tokens
}
