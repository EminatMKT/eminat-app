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
  { column: 'telefono', labelKey: 'med.import.field.telefono' },
  { column: 'telefono_alt', labelKey: 'med.import.field.telefonoAlt' },
  { column: 'email', labelKey: 'med.import.field.email' },
]

const PACIENTE_COLUMNS = PACIENTE_FIELD_DEFS.map(f => f.column)

// header crudo -> columna real, vía alias. Cubre los headers plausibles de las tres fuentes
// (no se conocen los headers exactos del archivo real hasta que se importe en producción —
// `resolveToCanonical` ya deja pasar el nombre de columna real tal cual, así que un header
// que no matchee ningún alias simplemente se ignora, no rompe nada).
const HEADER_ALIASES: Record<string, string> = {
  name: 'nombre_crudo',
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
}

// Cualquier header que hable de teléfono. La primera columna de teléfono de una fila mapea a
// `telefono`; una SEGUNDA columna de teléfono (ECW trae Home y Cell) mapea a `telefono_alt` —
// es el único campo de este catálogo donde el orden de aparición en el archivo importa.
const TELEFONO_RE = /phone|telefono|teléfono|tel$/

const normHeader = (h: string) => h.trim().toLowerCase().replace(/_/g, ' ').replace(/\s+/g, ' ')

export function guessMapping(headers: string[]): (string | null)[] {
  let telefonoUsado = false
  return headers.map(h => {
    const norm = normHeader(h)
    if (TELEFONO_RE.test(norm)) {
      const col = telefonoUsado ? 'telefono_alt' : 'telefono'
      telefonoUsado = true
      return col
    }
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
