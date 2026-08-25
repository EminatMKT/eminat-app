// centinela-exime: archivo-extenso@1 — 62 líneas para dos funciones que son una sola idea:
// `dispara` decide por un check y `revisar` recorre todos. La exención versionada ya salió
// a exencion.ts; separar estas dos sería partir una condición de su bucle.
// Evaluación: dado un check cargado y un contenido, ¿dispara la regla?

import { existsSync } from "node:fs"
import { cargar, type Check } from "./reglas.ts"
import { DETECTORES } from "./detectores.ts"
import { versionDeExencion } from "./exencion.ts"

export { versionDeExencion }

// Dónde rige el centinela por defecto. `rules/centinela/` está adentro a propósito: el
// guardia se aplica sus propias reglas (25/08/2026; lo primero que frenó fue detectores.ts,
// que tenía 327 líneas).
const ALCANCE_DEFAULT = ["/src/", "/rules/centinela/"]

export function dispara(chk: Check, path: string, texto: string): boolean {
  // `paths:` amplía el alcance más allá de src/ (ej. migraciones SQL).
  if (chk.paths?.length) {
    if (!chk.paths.some((p) => path.includes(p))) return false
  } else if (!ALCANCE_DEFAULT.some((p: string) => path.includes(p) || path.startsWith(p.slice(1)))) {
    // El centinela se aplica sus propias reglas: si el guardia puede tener un archivo de 300
    // líneas o un `any`, la regla no la cree nadie. Se agregó el 25/08/2026 y lo primero que
    // frenó fue `detectores.ts`, que tenía 327 líneas.
    return false
  }
  if (chk.files.length && !chk.files.some((f) => path.endsWith(f))) return false
  if (chk.except.some((x) => path.includes(x))) return false
  if (chk.requires && !new RegExp(chk.requires).test(texto)) return false
  // Exención versionada: vale sólo si la marca es de la versión vigente de la regla. Una regla
  // que se endurece sube su `version:` y con eso invalida las marcas viejas, que pasan a pedir
  // revalidación en vez de seguir silenciando para siempre.
  if (chk.exime) {
    // IGUALDAD exacta, no `>=`: con mayor-o-igual, firmar `@99` sobrevivía a toda versión
    // futura y la marca dejaba de caducar nunca — un escape permanente disfrazado de firma.
    // La marca vale para LA versión de la regla que se revisó, y sólo para esa.
    if (versionDeExencion(texto, chk.exime) === (chk.version ?? 1)) return false
  }
  if (chk.detector) return Boolean(DETECTORES[chk.detector]?.(texto, path, chk.params))
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
    } catch (e) {
      // Un check roto NO se ignora: se reporta como falla. Antes esto era `continue`, y el
      // resultado era que un detector con un bug —una constante borrada, un regex inválido— se
      // comportaba exactamente igual que uno que no dispara. La regla dejaba de proteger y
      // nadie se enteraba, que es la peor forma de fallar que puede tener un guardia.
      fallan.push({
        regla: `${chk.regla} (CHECK ROTO)`,
        motivo: `el check falló al evaluarse: ${e instanceof Error ? e.message : String(e)}. Arreglá el detector antes de seguir — mientras esté roto, esta regla no protege nada.`,
      })
    }
  }
  return fallan
}
