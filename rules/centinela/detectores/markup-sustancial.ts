export function markupSustancial(texto: string, path: string): boolean {
  // Un .tsx que dibuja estructura de verdad: tres elementos JSX o más. No juzga el contenido
  // —la similitud con OTROS archivos es lo que ningún detector de un archivo puede ver—; lo
  // que habilita es exigir la marca de que alguien buscó antes de escribirlo.
  if (!path.endsWith(".tsx")) return false
  let enTemplate = false
  let elementos = 0
  for (const linea of texto.split("\n")) {
    const l = linea.trim()
    if (l.startsWith("//") || l.startsWith("*") || l.startsWith("/*")) continue
    const backticks = (linea.match(/`/g) ?? []).length
    if (enTemplate) {
      if (backticks % 2 === 1) enTemplate = false
      continue
    }
    if (backticks % 2 === 1) { enTemplate = true; continue }
    // Un template literal que abre y cierra en la MISMA línea deja los backticks pares, así
    // que el guardia de arriba no lo ve: hay que quitarle el contenido antes de contar.
    const limpia = linea.replace(/`[^`]*`/g, "``")
    elementos += limpia.match(/<[A-Za-z][\w.]*[\s/>]/g)?.length ?? 0
    if (elementos >= 3) return true
  }
  return false
}
