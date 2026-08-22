// Plan de import genérico: decide insert/update/fusión/tumba/repetida para cada fila de un
// archivo. No sabe qué es un lead ni un paciente — lo único que varía entre módulos es la
// identidad (`Identity`, en `../identity`) que cada uno le pasa: Research reconoce un lead por
// su NCT#, Medical un paciente por nombre+DOB en dos niveles. Sin React, sin red.
import type { Identity, ImportPlan } from '../identity'

export function buildImportPlan<Row extends string[] = string[]>(input: {
  rows: Row[]
  mapping: (string | null)[]
  identity: Identity<Row>
  coerce: (col: string, v: string) => unknown
}): ImportPlan {
  const { rows, mapping, identity, coerce } = input
  const plan: ImportPlan = { toInsert: [], toUpdate: [], toMerge: [], repetidas: 0, tumbas: 0, skipped: 0 }
  const vistas = new Set<string>()

  rows.forEach((fila, i) => {
    const values: Record<string, unknown> = {}
    mapping.forEach((col, idx) => {
      if (col) values[col] = coerce(col, (fila[idx] ?? '').trim())
    })
    // Fila totalmente vacía (todas las celdas mapeadas dieron null): no cuenta para nada.
    if (!Object.values(values).some((v) => v !== null)) return

    const clave = identity.claveOrigen(fila, i)
    // Dos filas con la misma clave de origen son la misma fila repetida en el archivo: la
    // segunda no se procesa de nuevo, solo se cuenta.
    if (vistas.has(clave)) { plan.repetidas++; return }
    vistas.add(clave)

    const id = identity.existente(clave)
    if (id !== undefined) {
      // Cadena vacía = tumba: la clave existe pero el destino la tiene con id null (un
      // registro borrado a propósito). El import no la recrea.
      if (id === '') { plan.tumbas++; return }
      plan.toUpdate.push({ id, values })
      return
    }

    const candidatosFila = identity.candidatos(fila, i)
    if (candidatosFila.length > 0) {
      plan.toMerge.push({
        values,
        candidatos: candidatosFila,
        preMarcado: candidatosFila.some((c) => c.nivel === 'exacta'),
      })
      return
    }

    plan.toInsert.push(values)
  })

  return plan
}
