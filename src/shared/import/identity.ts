// Identidad de una fila de import: lo único que cambia entre módulos. Research reconoce un
// lead por su NCT#; Medical reconoce un paciente por nombre+fecha de nacimiento en dos
// niveles (`@/features/medical/utils/pacienteIdentity`). El resto del plan de import
// (`buildImportPlan/`) es igual para los dos, así que la identidad entra por parámetro y
// este archivo no conoce ninguna de las dos formas de dominio.

// Nivel de confianza de un candidato de fusión: 'exacta' pre-marca la fusión, 'parcial' la deja
// para revisión manual. Declarado una sola vez para que `Identity.candidatos` y
// `MergeCandidate.candidatos` no repitan la misma unión de literales por separado.
export type NivelCandidato = 'exacta' | 'parcial'
export type CandidatoFusion = { nivel: NivelCandidato; id: string }

// `Row` es lo que ve `candidatos` — por default la fila cruda (`string[]`), la misma que ve
// `claveOrigen`. Un módulo que necesite pasarle a `candidatos` un subtipo más específico de
// `string[]` lo declara al instanciar `Identity<Row>`; el adaptador de cada módulo (el de
// Medical vive en la Tarea 10) es quien construye esa fila a partir de `fila`+`mapping`.
export type Identity<Row extends string[] = string[]> = {
  // La clave que reconoce la fila la próxima vez que se importe el mismo archivo. `i` es el
  // índice de la fila en el import actual — lo necesita una fuente que, sin él, no tenga con
  // qué distinguir dos filas (ver `pacienteIdentity.claveOrigen`, el caso sin DOB).
  claveOrigen: (fila: string[], i: number) => string
  // La clave ya existe en el destino: devuelve su id. `undefined` = no existe todavía. Cadena
  // vacía = existe pero es una "tumba" — un registro borrado a propósito (id null en el
  // destino) que el import NO recrea.
  existente: (clave: string) => string | undefined
  // Candidatos de fusión cuando la clave no existe todavía: sin ninguno, la fila va derecho a
  // `toInsert`.
  candidatos: (fila: Row, i: number) => CandidatoFusion[]
}

export interface MergeCandidate {
  values: Record<string, unknown>
  candidatos: CandidatoFusion[]
  preMarcado: boolean
}

export interface ImportPlan {
  toInsert: Record<string, unknown>[]
  toUpdate: { id: string; values: Record<string, unknown> }[]
  toMerge: MergeCandidate[]
  repetidas: number
  tumbas: number
  skipped: number
}
