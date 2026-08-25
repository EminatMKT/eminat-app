// Evaluación: dado un check cargado y un contenido, ¿dispara la regla?

import { existsSync } from "node:fs"
import { cargar, type Check } from "./reglas.ts"
import { DETECTORES } from "./detectores.ts"

export function dispara(chk: Check, path: string, texto: string): boolean {
  // `paths:` amplía el alcance más allá de src/ (ej. migraciones SQL).
  if (chk.paths?.length) {
    if (!chk.paths.some((p) => path.includes(p))) return false
  } else if (!path.includes("/src/") && !path.startsWith("src/")) {
    return false
  }
  if (chk.files.length && !chk.files.some((f) => path.endsWith(f))) return false
  if (chk.except.some((x) => path.includes(x))) return false
  if (chk.requires && !new RegExp(chk.requires).test(texto)) return false
  if (chk.detector) return Boolean(DETECTORES[chk.detector]?.(texto, path))
  if (chk.absent) return !new RegExp(chk.absent).test(texto)
  return Boolean(chk.pattern && new RegExp(chk.pattern).test(texto))
}

/** → las reglas que este contenido no pasa. Vacío = pasa. */
export function revisar(path: string, texto: string, esNuevo?: boolean, checks?: Check[]) {
  const lista = checks ?? cargar()
  if (esNuevo === undefined) {
    try { esNuevo = !existsSync(path) } catch { esNuevo = false }
  }
  const fallan: { regla: string; motivo: string }[] = []
  for (const chk of lista) {
    try {
      if (dispara(chk, path, texto) && (esNuevo || !chk.soloNuevos)) fallan.push({ regla: chk.regla, motivo: chk.motivo })
    } catch {
      continue
    }
  }
  return fallan
}
