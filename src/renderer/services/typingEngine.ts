import { getKeyDistance, getNearbyKey, isTypableChar } from './keyboardDistance'
import { parseMacros } from './macroParser'

export interface HumanConfig {
  typoRate: number
  autocorrect: boolean
  correctionDelay: number
  burstSpeed: boolean
  autoClick: boolean
  newlineMode: 'enter' | 'shift+enter'
  macrosEnabled: boolean
}

export const DEFAULT_HUMAN_CONFIG: HumanConfig = {
  typoRate: 8,
  autocorrect: true,
  correctionDelay: 60,
  burstSpeed: true,
  autoClick: true,
  newlineMode: 'shift+enter',
  macrosEnabled: true,
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

function getDelay(speed: number, distance: number, isBurst: boolean): number {
  const base = 280 - speed * 2.45
  const distFactor = (100 - speed) * 0.38
  const jitter = (Math.random() - 0.5) * base * 0.35
  const burstMod = isBurst ? 0.35 : 1
  return Math.max(18, (base + distance * distFactor + jitter) * burstMod)
}

interface TypeAPI {
  typeChar: (char: string) => Promise<void>
  typeBackspace: () => Promise<void>
  pressCombo: (sendKeys: string) => Promise<void>
}

export async function typeText(
  text: string,
  speed: number,
  humanConfig: HumanConfig,
  onProgress: (typedCount: number) => void,
  signal: AbortSignal,
  api: TypeAPI,
  onMacroSkip?: (raw: string) => void,
): Promise<void> {
  const tokens = parseMacros(text, humanConfig.macrosEnabled)

  let prev = ''
  let burstCount = 0
  let burstRemaining = 0
  let rawProgress = 0

  for (const token of tokens) {
    if (signal.aborted) break

    if (token.type === 'macro') {
      await api.pressCombo(token.sendKeys)
      rawProgress += token.raw.length
      onProgress(rawProgress)
      continue
    }

    if (token.type === 'unknown-macro') {
      onMacroSkip?.(token.raw)
      rawProgress += token.raw.length
      onProgress(rawProgress)
      continue
    }

    if (token.type === 'pause') {
      await sleep(token.ms)
      continue
    }

    // text token — run per-character human typing logic
    for (const char of token.chars) {
      if (signal.aborted) break

      // Burst speed logic
      let isBurst = false
      if (humanConfig.burstSpeed) {
        if (burstRemaining > 0) {
          isBurst = true
          burstRemaining--
        } else if (Math.random() < 0.08 && burstCount < 3) {
          isBurst = true
          burstRemaining = Math.floor(Math.random() * 6) + 3
          burstCount++
        } else {
          burstCount = Math.max(0, burstCount - 0.5)
        }
      }

      const distance = prev ? getKeyDistance(prev, char) : 0
      const delay = getDelay(speed, distance, isBurst)
      await sleep(delay)
      if (signal.aborted) break

      // Newline: route through pressCombo so newlineMode applies
      if (char === '\n') {
        const sendKeys = humanConfig.newlineMode === 'shift+enter' ? '+{ENTER}' : '{ENTER}'
        await api.pressCombo(sendKeys)
        prev = char
        rawProgress++
        onProgress(rawProgress)
        continue
      }

      // Typo logic
      const makeTypo =
        humanConfig.typoRate > 0 &&
        isTypableChar(char) &&
        Math.random() * 100 < humanConfig.typoRate

      if (makeTypo) {
        const typoChar = getNearbyKey(char)
        if (typoChar !== char) {
          await api.typeChar(typoChar)
          prev = typoChar

          if (humanConfig.autocorrect) {
            const reactionMs =
              120 + (100 - humanConfig.correctionDelay) * 5 + Math.random() * 80
            await sleep(reactionMs)
            if (signal.aborted) break
            await api.typeBackspace()
            await sleep(40)
            if (signal.aborted) break
          }
        }
      }

      await api.typeChar(char)
      prev = char
      rawProgress++
      onProgress(rawProgress)
    }
  }
}
