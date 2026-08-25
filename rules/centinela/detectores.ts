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

export function reglaSinCheck(texto: string): boolean {
  // Cada sección `## ` de un archivo de reglas lleva o su `<!-- check:` o una
  // exención `<!-- sin check: <razón> -->` (rules/README.md · "toda regla nueva
  // intenta nacer con su check"). Sin ninguno de los dos = regla que se olvidó.
  // El encabezado cuenta como parte de su sección: el marcador puede ir al pie
  // del título.
  let cuerpo: string | null = null
  for (const linea of texto.split("\n")) {
    if (/^##\s/.test(linea)) {
      if (cuerpo !== null && !cuerpo.includes("<!-- check") && !cuerpo.includes("<!-- sin check:")) return true
      cuerpo = ""
    }
    if (cuerpo !== null) cuerpo += linea + "\n"
  }
  return cuerpo !== null && !cuerpo.includes("<!-- check") && !cuerpo.includes("<!-- sin check:")
}

export const DETECTORES: Record<string, (texto: string, path: string) => boolean> = {
  style_inline: styleInline,
  check_inline_enum: checkInlineEnum,
  regla_sin_check: reglaSinCheck,
}
