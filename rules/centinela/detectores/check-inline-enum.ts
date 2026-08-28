export function checkInlineEnum(texto: string): boolean {
  // CHECK (... IN (...)) en una línea de columna. El CHECK de un CREATE DOMAIN
  // es exactamente la forma que se quiere: se declara en su propia línea y la
  // anterior dice CREATE DOMAIN. // ponytail: mira sólo la línea anterior,
  // si algún día el DOMAIN se declara en tres líneas, esto se actualiza.
  let prev = ""
  for (const linea of texto.split("\n")) {
    const l = linea.trim()
    const esDeUnDomain = l.includes("CREATE DOMAIN") || prev.includes("CREATE DOMAIN")
    if (!esDeUnDomain && /CHECK\s*\(/.test(l) && /\bIN\s*\(/.test(l)) return true
    prev = l
  }
  return false
}
