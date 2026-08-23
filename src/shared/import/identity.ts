// Identidad de una fila de import: lo único que cambia entre módulos. Research reconoce un
// lead por su NCT#; Medical reconoce un paciente por nombre+fecha de nacimiento en dos
// niveles (`@/features/medical/utils/pacienteIdentity`). El resto del plan de import
// (`buildImportPlan/`) es igual para los dos, así que la identidad entra por parámetro y
// este archivo no conoce ninguna de las dos formas de dominio.
import type { I18nKey } from '@/shared/i18n'

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
  // La clave ya existe en el destino: devuelve su id. `undefined` = no existe todavía. `null` =
  // existe, pero es una "tumba" — un registro borrado a propósito (id null en el destino) que
  // el import NO recrea. La misma forma que ya usa la base (`paciente_id: null`).
  existente: (clave: string) => string | null | undefined
  // Candidatos de fusión cuando la clave no existe todavía: sin ninguno, la fila va derecho a
  // `toInsert`.
  candidatos: (fila: Row, i: number) => CandidatoFusion[]
  // Colapsa dos filas con la misma clave de origen en una sola (la primera; la(s) siguiente(s)
  // suman `repetidas`) en vez de procesarlas por separado. Default `false`: la mayoría de los
  // módulos no tiene filas repetidas y colapsarlas en silencio cambiaría cuál gana un
  // update, o el conteo de un `skip` — un comportamiento que Research ya tenía en producción y
  // que un refactor no puede alterar sin que alguien lo pida. Medical sí lo prende: su archivo
  // trae 47 filas literalmente repetidas.
  colapsarRepetidas?: boolean
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

// Una anomalía del paso 4 (saneamiento): lo que un normalizador del módulo marcó en una celda
// -mojibake, fecha futura, teléfono roto- con el crudo al lado de lo interpretado. `colIndex`
// es la posición de la celda dentro de la fila del archivo (no la columna de destino): con ella
// el modal sabe qué celda tocar si el usuario edita el valor. `null` = la anomalía es de la fila
// entera (ej. "no parece un paciente") y no hay una celda puntual que editar — solo se excluye.
// El mensaje va por clave i18n, nunca texto armado acá: quien detecta la anomalía es del
// dominio (Medical), pero quien la RENDERIZA es este módulo compartido, y nada que un usuario
// vea se escribe inline (ver codigo.md).
export interface SanitizeIssue {
  rowIndex: number
  colIndex: number | null
  messageKey: I18nKey
  messageParams?: Record<string, string | number>
  crudo: string
  interpretado: string
}

// Aviso de "no sé qué es este archivo", paso 2 (hoja). Misma forma que `SanitizeIssue`: el
// mensaje va por clave i18n, el módulo del dominio decide cuál y con qué parámetros (Medical
// no reconoce la hoja por su nombre), y este módulo compartido solo lo renderiza y usa su
// presencia para bloquear el botón de Importar — sin eso, un heurístico que falla queda mudo y
// el botón sigue habilitado sobre un plan vacío (ver el comentario de `ImportModal.validateSource`).
// `null` = sin problema.
export type SourceWarning = { messageKey: I18nKey; messageParams?: Record<string, string | number> }
