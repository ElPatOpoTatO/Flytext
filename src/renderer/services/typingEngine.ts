import { getKeyDistance, getNearbyKey, isTypableChar } from './keyboardDistance'

export interface HumanConfig {
  typoRate: number      // 0–100
  autocorrect: boolean
  correctionDelay: number // 0–100 (100 = instant correction)
  burstSpeed: boolean
}

export const DEFAULT_HUMAN_CONFIG: HumanConfig = {
  typoRate: 8,
  autocorrect: true,
  correctionDelay: 60,
  burstSpeed: true,
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

function getDelay(
  speed: number,
  distance: number,
  isBurst: boolean,
): number {
  // speed 0–100: 0 = ~280ms base, 100 = ~35ms base
  const base = 280 - speed * 2.45
  const distFactor = (100 - speed) * 0.38
  const jitter = (Math.random() - 0.5) * base * 0.35
  const burstMod = isBurst ? 0.35 : 1
  return Math.max(18, (base + distance * distFactor + jitter) * burstMod)
}

interface TypeAPI {
  typeChar: (char: string) => Promise<void>
  typeBackspace: () => Promise<void>
}

export async function typeText(
  text: string,
  speed: number,
  humanConfig: HumanConfig,
  onProgress: (typedCount: number) => void,
  signal: AbortSignal,
  api: TypeAPI,
): Promise<void> {
  let prev = ''
  let burstCount = 0
  let burstRemaining = 0

  for (let i = 0; i < text.length; i++) {
    if (signal.aborted) break
    const char = text[i]

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

    // Decide if we make a typo
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
          // Pause before noticing
          const reactionMs =
            120 + (100 - humanConfig.correctionDelay) * 5 + Math.random() * 80
          await sleep(reactionMs)
          if (signal.aborted) break

          // Backspace
          await api.typeBackspace()
          await sleep(40)
          if (signal.aborted) break
        }
        // If no autocorrect, the typo stays and we continue
      }
    }

    await api.typeChar(char)
    prev = char
    onProgress(i + 1)
  }
}
