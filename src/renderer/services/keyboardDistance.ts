// QWERTY key positions [col, row] with row offsets for stagger
const QWERTY: Record<string, [number, number]> = {
  '1': [0, 0], '2': [1, 0], '3': [2, 0], '4': [3, 0], '5': [4, 0],
  '6': [5, 0], '7': [6, 0], '8': [7, 0], '9': [8, 0], '0': [9, 0],
  'q': [0, 1], 'w': [1, 1], 'e': [2, 1], 'r': [3, 1], 't': [4, 1],
  'y': [5, 1], 'u': [6, 1], 'i': [7, 1], 'o': [8, 1], 'p': [9, 1],
  'a': [0.5, 2], 's': [1.5, 2], 'd': [2.5, 2], 'f': [3.5, 2], 'g': [4.5, 2],
  'h': [5.5, 2], 'j': [6.5, 2], 'k': [7.5, 2], 'l': [8.5, 2],
  'z': [1, 3], 'x': [2, 3], 'c': [3, 3], 'v': [4, 3], 'b': [5, 3],
  'n': [6, 3], 'm': [7, 3],
}

const NEIGHBORS: Record<string, string[]> = {
  'a': ['q', 's', 'z', 'w'], 'b': ['v', 'g', 'h', 'n'],
  'c': ['x', 'd', 'f', 'v'], 'd': ['s', 'e', 'f', 'r', 'x', 'c'],
  'e': ['w', 'r', 's', 'd'], 'f': ['d', 'r', 'g', 't', 'c', 'v'],
  'g': ['f', 't', 'h', 'y', 'v', 'b'], 'h': ['g', 'y', 'j', 'u', 'b', 'n'],
  'i': ['u', 'o', 'j', 'k'], 'j': ['h', 'u', 'k', 'i', 'n', 'm'],
  'k': ['j', 'i', 'l', 'o', 'm'], 'l': ['k', 'o', 'p'],
  'm': ['n', 'j', 'k'], 'n': ['b', 'h', 'm', 'j'],
  'o': ['i', 'p', 'k', 'l'], 'p': ['o', 'l'],
  'q': ['w', 'a', 's'], 'r': ['e', 't', 'd', 'f'],
  's': ['a', 'w', 'd', 'e', 'z', 'x'], 't': ['r', 'y', 'f', 'g'],
  'u': ['y', 'i', 'h', 'j'], 'v': ['c', 'f', 'b', 'g'],
  'w': ['q', 'e', 'a', 's'], 'x': ['z', 's', 'c', 'd'],
  'y': ['t', 'u', 'g', 'h'], 'z': ['a', 's', 'x'],
}

export function getKeyDistance(a: string, b: string): number {
  const posA = QWERTY[a.toLowerCase()]
  const posB = QWERTY[b.toLowerCase()]
  if (!posA || !posB) return 1.5
  const dx = posA[0] - posB[0]
  const dy = posA[1] - posB[1]
  return Math.sqrt(dx * dx + dy * dy)
}

export function getNearbyKey(char: string): string {
  const c = char.toLowerCase()
  const neighbors = NEIGHBORS[c]
  if (!neighbors || neighbors.length === 0) return char
  const pick = neighbors[Math.floor(Math.random() * neighbors.length)]
  return char === char.toUpperCase() ? pick.toUpperCase() : pick
}

export function isTypableChar(char: string): boolean {
  return char.length === 1 && char.codePointAt(0)! >= 32
}
