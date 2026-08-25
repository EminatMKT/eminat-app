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

export const DETECTORES: Record<string, (texto: string, path: string) => boolean> = {
  style_inline: styleInline,
}
