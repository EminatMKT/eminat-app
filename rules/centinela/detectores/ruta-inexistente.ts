import { existsSync } from "node:fs"
import { join } from "node:path"
import { RULES } from "../reglas.ts"
import type { Detector } from "./tipos.ts"

const RAIZ = join(RULES, "..")

// Una ruta del repo: al menos dos segmentos separados por barra. Se exige la barra a propósito,
// porque sin ella cualquier palabra entre backticks (`main`, `pnpm`) parecería un archivo.
const PARECE_RUTA = /^[\w.@-]+(\/[\w.@-]+)+\/?$/

// Un archivo de contexto miente barato: nombra una ruta, la ruta se mueve, y el texto sigue
// diciendo lo mismo sin que nada falle. Acá se verifica lo único verificable de "estar al día":
// que cada ruta nombrada entre backticks exista de verdad.
export const rutaInexistente: Detector = (texto) => {
  for (const m of texto.matchAll(/`([^`\n]+)`/g)) {
    const cita = m[1].trim()
    if (!PARECE_RUTA.test(cita)) continue
    // `@scope/paquete` es una dependencia npm, no una ruta. El alias `@/` del repo sí lo es.
    if (cita.startsWith("@") && !cita.startsWith("@/")) continue
    // Un `...` marca un ejemplo ilustrativo, no una ruta concreta que deba existir.
    if (cita.includes("...")) continue
    const relativo = (cita.startsWith("@/") ? "src/" + cita.slice(2) : cita).replace(/\/$/, "")
    if (!existsSync(join(RAIZ, relativo))) return true
  }
  return false
}
