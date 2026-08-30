import { salida } from "./cambiados.ts"

// Cuánto de un archivo cambió respecto de la base. 1 = se reescribió entero.
//
// Existe por un agujero que se vio dos veces el 29/08: un check `contact` sólo frena archivos
// NUEVOS, y el barrido sólo reporta lo que EMPEORÓ. Entre los dos queda un hueco por el que pasa
// el caso más común de todos — reescribir un archivo entero y conservar sus incumplimientos.
// `ConfirmModal` se rehízo de punta a punta y siguió con ocho props en la firma: para el hook no
// era nuevo, y para el barrido no era una regresión porque ya estaba así.
//
// Un archivo reescrito es un archivo que se escribió: le tocan las reglas de lo que nace, no la
// deuda de lo que estaba. El umbral es alto a propósito —cambiar dos líneas no es reescribir—,
// así que un arreglo puntual sigue midiéndose contra la base.
export const UMBRAL_REESCRITURA = 0.6

export function esReescritura(archivo: string, base: string, lineasAhora: number): boolean {
  if (lineasAhora === 0) return false
  const stat = salida(["diff", "--numstat", base, "--", archivo]).trim().split("\n")[0] ?? ""
  const [mas, menos] = stat.split("\t")
  const movidas = (Number(mas) || 0) + (Number(menos) || 0)
  return movidas / lineasAhora >= UMBRAL_REESCRITURA
}
