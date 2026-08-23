// Plan de import de pacientes: envuelve el `buildImportPlan` genérico (`@/shared/import`) con
// la identidad de Medical (`../pacienteIdentity`) — nombre+DOB en dos niveles, clave por
// (fuente, clave_origen) — y con el saneamiento del paso 4. No sabe de React ni de red: recibe
// los pacientes y las fuentes ya cargados, y devuelve un `ImportPlan` genérico.
//
// El truco de este archivo: el plan genérico asume UNA celda → UN campo (`coerce(col, v)`), y
// acá un nombre puede salir de UNA celda (ECW/eClinPro, `nombre_crudo`) o de DOS (eMedicalPractice,
// `nombre`+`apellido` como First/Last ya separados) según la fuente — y la clave de identidad no
// es una celda del archivo, es un cálculo sobre varias. La solución es `augmentar`: antes de
// llamar al plan genérico, cada fila se le pega columnas SINTÉTICAS al final —nombre y apellido
// YA parseados, la clave de origen YA calculada, el teléfono alterno YA deduplicado contra el
// principal— y se agregan esos mismos nombres a `mapping`. Como el genérico arma `values`
// iterando `mapping` en orden y pisando claves repetidas, las columnas sintéticas (al final)
// pisan cualquier mapeo directo que hubiera para 'nombre'/'apellido'/'telefono_alt', y la
// identidad simplemente LEE esas columnas en vez de recalcularlas.
import { buildImportPlan as buildPlanCompartido } from '@/shared/import'
import type { Identity, ImportPlan, SanitizeIssue } from '@/shared/import'
import {
  parseNombre, claveOrigen as claveOrigenDe, candidatos as candidatosDe,
  type Crudo, type Identificable,
} from '../pacienteIdentity'
import { repararMojibake, normalizarTelefono, serialADate } from '../normalizers'
import { normalizeDomainValue } from '../pacienteFields'
import type { FuentePaciente } from '@/features/medical/constants'
import type { Paciente, PacienteFuente } from '@/features/medical/types'

export type DupMode = 'update' | 'skip'
export type ValueMap = Record<string, Record<string, string>>

const COL_NOMBRE_CRUDO = 'nombre_crudo'
const COL_NOMBRE = 'nombre'
const COL_APELLIDO = 'apellido'
const COL_CHART = 'chart'
const COL_DOB = 'fecha_nacimiento'
const COL_GENERO = 'genero'
const COL_EMAIL = 'email'
const COL_TEL = 'telefono'
const COL_TEL_ALT = 'telefono_alt'
// Columnas sintéticas que `augmentar` apila al final de cada fila, en este orden fijo.
// `__fuente__` viaja en cada fila -no solo como parámetro de `buildPacienteImportPlan`- porque
// el plan resultante (`ImportPlan.toInsert`/`toUpdate`) son `Record<string, unknown>` sueltos:
// nada los liga de vuelta a la fuente con la que se calcularon una vez que salen de acá. Quien
// arma `FilaEscritura` para `escribirImport` (el pegamento de Medical) la lee de ahí.
const COL_CLAVE = '__clave_origen__'
const COL_NOMBRE_ORIGEN = '__nombre_origen__'
const COL_FUENTE = '__fuente__'
export { COL_CLAVE, COL_NOMBRE_ORIGEN, COL_FUENTE }
const SINTETICAS = [COL_NOMBRE, COL_APELLIDO, COL_CLAVE, COL_NOMBRE_ORIGEN, COL_TEL_ALT, COL_FUENTE] as const

// El nombre del hoja de un libro real trae el nombre del sistema de origen (ver el spec: el
// archivo se llama "EMINAT PT REGISTRY - ECW, ECLINPRO, EMED.xlsx" y sus tres hojas se nombran
// igual). `null` = no se pudo reconocer, y el import se bloquea con un aviso en vez de adivinar
// una fuente y calcular claves de identidad sobre una fila que en realidad es de otro sistema.
export function fuenteDeHoja(hoja: string): FuentePaciente | null {
  const h = hoja.toLowerCase()
  if (h.includes('eclinpro')) return 'eclinpro'
  if (h.includes('emed')) return 'emed'
  if (h.includes('ecw') || h.includes('eclinicalworks')) return 'ecw'
  return null
}

// (fuente, clave_origen) → id del paciente, o `null` si es una tumba (paciente_id NULL en
// `paciente_fuentes`, por el `ON DELETE SET NULL` de la migración). Filtrado por fuente: la
// misma clave de texto bajo otra fuente no es la misma identidad.
export function indexPorClave(fuente: FuentePaciente, fuentes: readonly PacienteFuente[]): Map<string, string | null> {
  const m = new Map<string, string | null>()
  for (const f of fuentes) if (f.fuente === fuente) m.set(f.clave_origen, f.paciente_id)
  return m
}

function crudoDeFila(fuente: FuentePaciente, fila: readonly string[], mapping: (string | null)[]): { crudo: Crudo; nombreOrigen: string } {
  if (fuente === 'emed') {
    const first = fila[mapping.indexOf(COL_NOMBRE)] ?? ''
    const last = fila[mapping.indexOf(COL_APELLIDO)] ?? ''
    return { crudo: { first, last }, nombreOrigen: `${first} ${last}`.trim() }
  }
  const texto = fila[mapping.indexOf(COL_NOMBRE_CRUDO)] ?? ''
  return { crudo: texto, nombreOrigen: texto }
}

function augmentar(fuente: FuentePaciente, rows: readonly string[][], mapping: (string | null)[]) {
  const iDob = mapping.indexOf(COL_DOB)
  const iChart = mapping.indexOf(COL_CHART)
  const iTel = mapping.indexOf(COL_TEL)
  const iTelAlt = mapping.indexOf(COL_TEL_ALT)

  const augmentedRows = rows.map((fila, i) => {
    const { crudo, nombreOrigen } = crudoDeFila(fuente, fila, mapping)
    const parsed = parseNombre(fuente, crudo)
    const dobCrudo = iDob >= 0 ? (fila[iDob] ?? '') : ''
    const chart = iChart >= 0 ? (fila[iChart] ?? '') : ''
    const clave = claveOrigenDe(fuente, { nombreCrudo: nombreOrigen, dobCrudo, chart, fila: i })

    // telefono_alt se apaga (vacío → coerce lo vuelve null) si coincide con telefono, una vez
    // normalizados los dos — "Home == Cell" del spec.
    let telAltRaw = iTelAlt >= 0 ? (fila[iTelAlt] ?? '') : ''
    if (iTel >= 0 && iTelAlt >= 0) {
      const tel = normalizarTelefono(fila[iTel] ?? '').valor
      const telAlt = normalizarTelefono(fila[iTelAlt] ?? '').valor
      if (tel && telAlt && tel === telAlt) telAltRaw = ''
    }

    return [...fila, parsed.nombre, parsed.apellido, clave, nombreOrigen, telAltRaw, fuente]
  })
  return { augmentedRows, augmentedMapping: [...mapping, ...SINTETICAS] }
}

// Lo que `candidatos()` de `pacienteIdentity` necesita de una fila, leído de la fila YA
// augmentada (nombre/apellido en las columnas sintéticas; DOB/teléfono/email en sus posiciones
// originales, que `augmentar` no toca).
function camposParaCandidato(fila: readonly string[], mapping: (string | null)[]): Omit<Identificable, 'id'> {
  const iDob = mapping.indexOf(COL_DOB)
  const iTel = mapping.indexOf(COL_TEL)
  const iEmail = mapping.indexOf(COL_EMAIL)
  const dob = iDob >= 0 ? serialADate(fila[iDob] ?? '').valor : null
  const tel = iTel >= 0 ? normalizarTelefono(fila[iTel] ?? '').valor : null
  const email = iEmail >= 0 ? (fila[iEmail] ?? '').trim() : ''
  return {
    nombre: fila[mapping.length + SINTETICAS.indexOf(COL_NOMBRE)] ?? '',
    apellido: fila[mapping.length + SINTETICAS.indexOf(COL_APELLIDO)] ?? '',
    fecha_nacimiento: dob,
    telefono: tel ?? undefined,
    email: email || undefined,
  }
}

function pacienteIdentityFor(
  fuente: FuentePaciente,
  mapping: (string | null)[],
  existentes: Map<string, string | null>,
  pacientes: readonly Identificable[],
): Identity<string[]> {
  const idxClave = mapping.length + SINTETICAS.indexOf(COL_CLAVE)
  return {
    claveOrigen: fila => fila[idxClave],
    existente: clave => existentes.get(clave),
    candidatos: fila => candidatosDe(camposParaCandidato(fila, mapping), pacientes)
      .map(c => ({ nivel: c.nivel, id: c.paciente.id })),
    // El archivo trae 47 filas literalmente repetidas (spec, "Colisiones dentro del mismo
    // lote") — sin esto un upsert con la misma clave dos veces aborta el lote entero.
    colapsarRepetidas: true,
  }
}

function resolveValue(col: string, raw: string, valueMap?: ValueMap): string {
  const override = valueMap?.[col]?.[raw]
  if (override !== undefined) return override
  const norm = normalizeDomainValue(col, raw)
  return norm === null ? '' : norm
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function coercePacienteCelda(col: string, v: string, valueMap: ValueMap): unknown {
  if (col === COL_CLAVE || col === COL_NOMBRE_ORIGEN || col === COL_CHART || col === COL_FUENTE) return v
  if (col === COL_NOMBRE || col === COL_APELLIDO) return v
  // Una edición del paso 4 puede reescribir la fecha directo en formato ISO (el usuario no
  // tiene por qué escribir un serial de Excel a mano) — se respeta tal cual en vez de
  // reinterpretarla como si fuera otro serial crudo.
  if (col === COL_DOB) return ISO_DATE.test(v) ? v : serialADate(v).valor
  if (col === COL_TEL || col === COL_TEL_ALT) return normalizarTelefono(v).valor
  if (col === COL_GENERO) return resolveValue(COL_GENERO, v, valueMap) || null
  if (col === COL_EMAIL) return v || null
  return v || null
}

export function buildPacienteImportPlan(input: {
  rows: string[][]
  mapping: (string | null)[]
  dupMode: DupMode
  valueMap: ValueMap
  fuente: FuentePaciente | null
  existentes: Map<string, string | null>
  pacientes: readonly Identificable[]
}): ImportPlan {
  const { rows, mapping, dupMode, valueMap, fuente, existentes, pacientes } = input
  if (!fuente) return { toInsert: [], toUpdate: [], toMerge: [], repetidas: 0, tumbas: 0, skipped: 0 }

  const { augmentedRows, augmentedMapping } = augmentar(fuente, rows, mapping)
  const identity = pacienteIdentityFor(fuente, mapping, existentes, pacientes)
  const coerce = (col: string, v: string) => coercePacienteCelda(col, v, valueMap)
  const plan = buildPlanCompartido({ rows: augmentedRows, mapping: augmentedMapping, identity, coerce })

  if (dupMode === 'skip') {
    return { ...plan, toUpdate: [], skipped: plan.skipped + plan.toUpdate.length }
  }
  return plan
}

function tieneTokenCorto(texto: string): boolean {
  return texto.trim().split(/\s+/).filter(Boolean).some(tok => tok.replace(/\.$/, '').length <= 2)
}

// Paso 4: saneamiento. No es un validador genérico — son los problemas medidos del archivo real
// (ver "## Paso 4" del spec). `fuente=null` (hoja sin reconocer) no marca nada: sin fuente no
// hay forma de parsear el nombre, y el import ya está bloqueado por otro lado.
export function detectPacienteAnomalies(
  fuente: FuentePaciente | null,
  rows: string[][],
  mapping: (string | null)[],
): SanitizeIssue[] {
  if (!fuente) return []
  const iNombreCrudo = fuente === 'emed' ? mapping.indexOf(COL_NOMBRE) : mapping.indexOf(COL_NOMBRE_CRUDO)
  const iDob = mapping.indexOf(COL_DOB)
  const iTel = mapping.indexOf(COL_TEL)
  const iTelAlt = mapping.indexOf(COL_TEL_ALT)
  const issues: SanitizeIssue[] = []

  rows.forEach((fila, rowIndex) => {
    const { crudo, nombreOrigen } = crudoDeFila(fuente, fila, mapping)
    const reparado = repararMojibake(nombreOrigen)
    if (reparado !== nombreOrigen) {
      issues.push({ rowIndex, colIndex: iNombreCrudo, messageKey: 'med.import.anomaly.mojibake', crudo: nombreOrigen, interpretado: reparado })
    }

    const parsed = parseNombre(fuente, crudo)
    if (parsed.ambiguo) {
      issues.push({
        rowIndex, colIndex: iNombreCrudo, messageKey: 'med.import.anomaly.ambiguous',
        crudo: nombreOrigen, interpretado: `${parsed.nombre} / ${parsed.apellido}`,
      })
    }
    if (!parsed.nombre || !parsed.apellido) {
      issues.push({
        rowIndex, colIndex: iNombreCrudo, messageKey: 'med.import.anomaly.emptyName',
        crudo: nombreOrigen, interpretado: `${parsed.nombre || '—'} / ${parsed.apellido || '—'}`,
      })
    } else if (tieneTokenCorto(parsed.nombre) || tieneTokenCorto(parsed.apellido)) {
      issues.push({
        rowIndex, colIndex: null, messageKey: 'med.import.anomaly.notAPatient',
        crudo: nombreOrigen, interpretado: `${parsed.nombre} ${parsed.apellido}`,
      })
    }

    if (iDob >= 0) {
      const dobCrudo = fila[iDob] ?? ''
      const r = serialADate(dobCrudo)
      if (r.marcada) {
        issues.push({
          rowIndex, colIndex: iDob,
          messageKey: r.motivo === 'futura' ? 'med.import.anomaly.futureDob' : 'med.import.anomaly.missingDob',
          crudo: dobCrudo, interpretado: r.valor ?? '',
        })
      }
    }
    for (const iTelCol of [iTel, iTelAlt]) {
      if (iTelCol < 0) continue
      const raw = fila[iTelCol] ?? ''
      if (!raw.trim()) continue
      const r = normalizarTelefono(raw)
      if (r.marcada) issues.push({ rowIndex, colIndex: iTelCol, messageKey: 'med.import.anomaly.invalidPhone', crudo: raw, interpretado: r.valor ?? '' })
    }
  })
  return issues
}

const PACIENTE_KEYS = ['nombre', 'apellido', 'fecha_nacimiento', 'genero', 'telefono', 'telefono_alt', 'email'] as const

// El parámetro de tipo `K` es lo que hace que el cast sea seguro: fijado el campo, TypeScript
// sabe que `values[campo]` -que en runtime ya coercionó `coercePacienteCelda`- tiene que ser
// `Paciente[K]`. Sin el genérico, un `for` sobre la UNIÓN de claves no distribuye el tipo por
// iteración y el cast deja de angostar (el mismo motivo por el que `escribirImport.ts` usa
// exactamente esta forma para su propio `asignar`).
function asignarCampo<K extends (typeof PACIENTE_KEYS)[number]>(destino: Partial<Paciente>, values: Record<string, unknown>, campo: K): void {
  if (campo in values) destino[campo] = values[campo] as Paciente[K]
}

// Recorta los `values` de una fila del plan (`Record<string, unknown>`, con las columnas
// sintéticas todavía adentro) a los campos reales de `Paciente` que `escribirImport` espera en
// `entrante`. Las columnas sintéticas (`__clave_origen__`, etc.) se quedan afuera solas: no
// están en `PACIENTE_KEYS`.
export function pacienteEntranteDe(values: Record<string, unknown>): Partial<Paciente> {
  const out: Partial<Paciente> = {}
  for (const k of PACIENTE_KEYS) asignarCampo(out, values, k)
  return out
}

// La otra mitad de una fila del plan: la identidad de origen que va a `paciente_fuentes`,
// leída de las columnas sintéticas que `augmentar` pegó en cada fila (`fuente` viaja con la
// fila, no solo como parámetro de `buildPacienteImportPlan` — ver el comentario de `SINTETICAS`).
export function fuenteEscrituraDe(values: Record<string, unknown>) {
  const fuente = values[COL_FUENTE] as FuentePaciente
  const clave_origen = String(values[COL_CLAVE] ?? '')
  return {
    fuente,
    clave_origen,
    nombre_origen: (values[COL_NOMBRE_ORIGEN] as string) || null,
    // Chart# de eMedicalPractice: es lo único que `ref_externa` guarda (ver el spec, columna
    // `ref_externa`) y coincide con la clave de esa fuente.
    ref_externa: fuente === 'emed' ? clave_origen : null,
  }
}
