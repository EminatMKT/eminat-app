// Detectores para lo que un regex no expresa. La clave se cita en el campo
// `detector:` de un check; el nombre de la función es su documentación.

export function styleInline(texto: string): boolean {
  // `style={{ }}` con propiedad CSS real; puras variables `--css` son la excepción.
  for (const m of texto.matchAll(/style=\{\{([\s\S]*?)\}\}/g)) {
    const claves = [...m[1].matchAll(/['"]?([A-Za-z-]+)['"]?\s*:/g)]
    if (claves.some((k) => !k[1].startsWith("--"))) return true
  }
  return false
}

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

export const DETECTORES: Record<string, (texto: string, path: string) => boolean> = {
  style_inline: styleInline,
  check_inline_enum: checkInlineEnum,
}
