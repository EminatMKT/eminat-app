// Contraseña temporal fuerte con crypto.getRandomValues. Excluye caracteres
// ambiguos (0/O, 1/l/I) para que el admin pueda leerla en voz alta sin confusión.
export function generateTempPassword(length = 14): string {
  const lower = 'abcdefghjkmnpqrstuvwxyz'
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const digits = '23456789'
  const symbols = '!@#$%&*'
  const all = lower + upper + digits + symbols
  const rand = new Uint32Array(length)
  crypto.getRandomValues(rand)
  // Garantiza al menos uno de cada clase.
  const chars: string[] = [
    lower[rand[0] % lower.length],
    upper[rand[1] % upper.length],
    digits[rand[2] % digits.length],
    symbols[rand[3] % symbols.length],
  ]
  for (let i = 4; i < length; i++) chars.push(all[rand[i] % all.length])
  // Shuffle con crypto para que los chars garantizados no queden siempre al frente.
  const shuffleSeed = new Uint32Array(chars.length)
  crypto.getRandomValues(shuffleSeed)
  for (let i = chars.length - 1; i > 0; i--) {
    const j = shuffleSeed[i] % (i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join('')
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
