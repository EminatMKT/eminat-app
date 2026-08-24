// Catálogo de campos del import de pacientes: qué columnas del archivo se pueden mapear, y a
// qué campo de `Paciente` (o a qué columna sintética, ver `pacienteImportPlan`) corresponden.
// `nombre_crudo` (ECW/eClinPro, un solo campo de nombre) y `nombre`/`apellido` (eMedicalPractice,
// First/Last ya separados) conviven en la MISMA lista: no hace falta que cambie según la fuente
// -el header de cada hoja solo mapea a los que existen en esa hoja, vía `guessMapping`- y así
// este catálogo no necesita saber qué hoja está activa.
import { resolveToCanonical } from '@/shared/utils/canonical'
import { GENEROS, type Genero } from '@/features/medical/constants'
import { normalizarGenero } from '../normalizers'
import type { ImportFieldDef } from '@/shared/import'

export const PACIENTE_FIELD_DEFS: ImportFieldDef[] = [
  { column: 'nombre_crudo', labelKey: 'med.import.field.nombreCrudo' },
  { column: 'nombre', labelKey: 'med.import.field.nombre' },
  { column: 'apellido', labelKey: 'med.import.field.apellido' },
  { column: 'chart', labelKey: 'med.import.field.chart' },
  { column: 'fecha_nacimiento', labelKey: 'med.import.field.fechaNacimiento' },
  { column: 'genero', labelKey: 'med.import.field.genero' },
  { column: 'telefono', labelKey: 'med.import.field.telefono', multi: true },
  { column: 'email', labelKey: 'med.import.field.email', multi: true },
]

const PACIENTE_COLUMNS = PACIENTE_FIELD_DEFS.map(f => f.column)

// header crudo -> columna real, vía alias. Cubre los headers plausibles de las tres fuentes
// (no se conocen los headers exactos del archivo real hasta que se importe en producción —
// `resolveToCanonical` ya deja pasar el nombre de columna real tal cual, así que un header
// que no matchee ningún alias simplemente se ignora, no rompe nada).
const HEADER_ALIASES: Record<string, string> = {
  name: 'nombre_crudo',
  // El header REAL de la hoja eClinicalWorks. `resolveToCanonical` compara por igualdad exacta,
  // no por substring, así que 'name' NO cubre 'Patient Name': sin este alias las 285 filas de esa
  // hoja entraban con nombre vacío y el saneamiento las marcaba TODAS. Lo destapó importar el
  // archivo real; ningún fixture con header 'Name' lo habría visto.
  'patient name': 'nombre_crudo',
  nombre: 'nombre_crudo',
  'first name': 'nombre',
  first: 'nombre',
  firstname: 'nombre',
  'last name': 'apellido',
  last: 'apellido',
  lastname: 'apellido',
  'chart#': 'chart',
  chart: 'chart',
  dob: 'fecha_nacimiento',
  'date of birth': 'fecha_nacimiento',
  birthdate: 'fecha_nacimiento',
  sex: 'genero',
  gender: 'genero',
  género: 'genero',
  email: 'email',
  'e-mail': 'email',
  // El header REAL de la columna de teléfono de eMedicalPractice. No lo agarra `TELEFONO_RE`
  // -no dice "phone" ni "tel"- y sin este alias las 1.266 filas de esa hoja entraban SIN
  // teléfono. Va acá y no en la regex a propósito: la regex reconoce lo que se PARECE a un
  // teléfono, y esto es un nombre propio de un sistema, no un parecido.
  'contact#': 'telefono',
}

// Cualquier header que hable de teléfono. TODA columna de teléfono mapea al MISMO campo:
// `telefono` acumula (`multi: true`, ver `ImportFieldDef`), así que ECW trayendo Home Y Cell
// ya no necesita un segundo campo inventado para la segunda columna — las dos entran como
// contactos del mismo paciente (`@/features/medical/utils/pacienteImportPlan`).
const TELEFONO_RE = /phone|telefono|teléfono|tel$/

const normHeader = (h: string) => h.trim().toLowerCase().replace(/_/g, ' ').replace(/\s+/g, ' ')

export function guessMapping(headers: string[]): (string | null)[] {
  return headers.map(h => {
    const norm = normHeader(h)
    if (TELEFONO_RE.test(norm)) return 'telefono'
    return resolveToCanonical(norm, PACIENTE_COLUMNS, { aliases: HEADER_ALIASES })
  })
}

// Headers del archivo que no mapean a ninguna columna conocida.
export function ignoredHeaders(headers: string[], mapping: (string | null)[]): string[] {
  const out: string[] = []
  headers.forEach((h, i) => {
    const name = (h ?? '').trim()
    if (!name || mapping[i] || out.includes(name)) return
    out.push(name)
  })
  return out
}

// Único campo de este catálogo con dominio fijo: género. Los demás son texto libre.
export function domainOptions(column: string): string[] | undefined {
  return column === 'genero' ? GENEROS : undefined
}

export function normalizeDomainValue(column: string, raw: string): string | null {
  if (column !== 'genero') return raw
  return normalizarGenero(raw)
}

export function generoCanonico(v: string): Genero | null {
  return normalizarGenero(v) as Genero | null
}
