// Especialidad médica de un estudio, derivada de clinicaltrials.gov.
//
// La API v2 NO tiene campo `specialty` (verificado contra /api/v2/studies/metadata). Lo que sí
// trae es `derivedSection.conditionBrowseModule`: la condición normalizada al diccionario MeSH
// (`meshes`) y su cadena de ancestros (`ancestors`), que sube hasta ~26 categorías raíz. Esa raíz
// ES el proxy de especialidad. Ver la subsección "Averiguado el 18/08/2026" en
// docs/requerimientos-crm-research-2026-08-12.md.
import type { I18nKey } from '@/shared/i18n'
import enJson from '@/shared/i18n/locales/en.json'

export type MeshTerm = { id?: string; term?: string }
export type ConditionBrowse = { meshes?: MeshTerm[]; ancestors?: MeshTerm[] }

// ÚNICO lugar con los literales canónicos de la columna research_leads.especialidad.
export const SPECIALTY = {
  ONCOLOGIA: 'Oncología',
  HEMATOLOGIA: 'Hematología',
  CARDIOLOGIA: 'Cardiología',
  NEUROLOGIA: 'Neurología',
  PSIQUIATRIA: 'Psiquiatría',
  ENDOCRINOLOGIA: 'Endocrinología',
  INFECTOLOGIA: 'Infectología',
  NEUMOLOGIA: 'Neumología',
  GASTROENTEROLOGIA: 'Gastroenterología',
  REUMATOLOGIA: 'Reumatología',
  DERMATOLOGIA: 'Dermatología',
  OFTALMOLOGIA: 'Oftalmología',
  GINECOLOGIA: 'Ginecología',
  UROLOGIA: 'Urología',
  INMUNOLOGIA: 'Inmunología',
  OTRAS: 'Otras',
} as const

export type Specialty = (typeof SPECIALTY)[keyof typeof SPECIALTY]

// Raíces MeSH que clasifican, EN ORDEN DE PRIORIDAD: el 44% de los estudios toca más de una
// (cáncer de mama sube por Neoplasms, Skin Diseases, Breast Diseases y Endocrine System
// Diseases a la vez), así que sin un orden explícito la especialidad la decidiría el orden en
// que CT.gov devuelve los ancestros. Gana la primera regla que matchea.
//
// El criterio del orden: primero lo que define al estudio por sobre el órgano que toca. Un
// ensayo de leucemia es oncología aunque el órgano sea la sangre; una diabetes autoinmune es
// endocrinología aunque el mecanismo sea inmune — por eso Inmunología va última, casi siempre
// hay una especialidad de órgano más precisa.
//
// Se matchea por TÉRMINO y no por id MeSH porque los nombres de descriptor son los que
// devuelve la API y son legibles acá; a cambio, un renombre de descriptor (raro) haría caer
// esa raíz al camino manual, nunca a una especialidad equivocada.
//
// 'Otras' NO está en esta tabla a propósito: significa "la miré y no encaja en ninguna", que
// es un juicio humano. La máquina solo afirma lo que puede probar; el resto es null.
const MESH_ROOTS: [Specialty, string[]][] = [
  [SPECIALTY.ONCOLOGIA,        ['neoplasms']],
  [SPECIALTY.HEMATOLOGIA,      ['hemic and lymphatic diseases', 'hematologic diseases']],
  [SPECIALTY.CARDIOLOGIA,      ['cardiovascular diseases']],
  [SPECIALTY.NEUROLOGIA,       ['nervous system diseases']],
  [SPECIALTY.PSIQUIATRIA,      ['mental disorders']],
  [SPECIALTY.ENDOCRINOLOGIA,   ['endocrine system diseases', 'nutritional and metabolic diseases']],
  [SPECIALTY.INFECTOLOGIA,     ['infections']],
  [SPECIALTY.NEUMOLOGIA,       ['respiratory tract diseases']],
  [SPECIALTY.GASTROENTEROLOGIA,['digestive system diseases']],
  [SPECIALTY.REUMATOLOGIA,     ['musculoskeletal diseases']],
  [SPECIALTY.DERMATOLOGIA,     ['skin and connective tissue diseases']],
  [SPECIALTY.OFTALMOLOGIA,     ['eye diseases']],
  [SPECIALTY.GINECOLOGIA,      ['female urogenital diseases and pregnancy complications']],
  [SPECIALTY.UROLOGIA,         ['male urogenital diseases', 'urologic diseases']],
  [SPECIALTY.INMUNOLOGIA,      ['immune system diseases']],
]

// Deriva la especialidad de `derivedSection.conditionBrowseModule`. null = no clasificable:
// o el estudio no tiene MeSH todavía (el 24% medido, sesgado a los registrados hace poco), o
// su raíz cae fuera del dominio. En los dos casos la completa una persona.
export function specialtyFromMesh(browse: ConditionBrowse): Specialty | null {
  // La raíz puede llegar como ancestro o como el término propio de la condición (un estudio
  // registrado directamente en "Cardiovascular Diseases" no tiene ancestros que mirar).
  const terms = new Set(
    [...(browse.meshes || []), ...(browse.ancestors || [])]
      .map(m => (m?.term || '').trim().toLowerCase())
      .filter(Boolean),
  )
  if (!terms.size) return null
  return MESH_ROOTS.find(([, roots]) => roots.some(r => terms.has(r)))?.[0] ?? null
}

// Etiqueta traducida de cada especialidad. `satisfies` exige EXACTAMENTE las del dominio: si
// se agrega una a SPECIALTY y no se traduce acá, es error de tsc.
export const SPECIALTY_LABEL_KEY = {
  [SPECIALTY.ONCOLOGIA]:        'research.specialty.oncologia',
  [SPECIALTY.HEMATOLOGIA]:      'research.specialty.hematologia',
  [SPECIALTY.CARDIOLOGIA]:      'research.specialty.cardiologia',
  [SPECIALTY.NEUROLOGIA]:       'research.specialty.neurologia',
  [SPECIALTY.PSIQUIATRIA]:      'research.specialty.psiquiatria',
  [SPECIALTY.ENDOCRINOLOGIA]:   'research.specialty.endocrinologia',
  [SPECIALTY.INFECTOLOGIA]:     'research.specialty.infectologia',
  [SPECIALTY.NEUMOLOGIA]:       'research.specialty.neumologia',
  [SPECIALTY.GASTROENTEROLOGIA]:'research.specialty.gastroenterologia',
  [SPECIALTY.REUMATOLOGIA]:     'research.specialty.reumatologia',
  [SPECIALTY.DERMATOLOGIA]:     'research.specialty.dermatologia',
  [SPECIALTY.OFTALMOLOGIA]:     'research.specialty.oftalmologia',
  [SPECIALTY.GINECOLOGIA]:      'research.specialty.ginecologia',
  [SPECIALTY.UROLOGIA]:         'research.specialty.urologia',
  [SPECIALTY.INMUNOLOGIA]:      'research.specialty.inmunologia',
  [SPECIALTY.OTRAS]:            'research.specialty.otras',
} satisfies Record<Specialty, I18nKey>

// Opciones del select, en el mismo orden de prioridad y con 'Otras' al final.
export const SPECIALTIES: Specialty[] = [...MESH_ROOTS.map(([s]) => s), SPECIALTY.OTRAS]

// Pliega un texto para comparar: sin espacios de borde, en minúsculas y sin tildes. Lo que
// entra por el import de CSV viene de una planilla, no del select, así que "oncologia" y
// "ONCOLOGÍA" tienen que resolver al mismo canónico.
const fold = (s: string) => (s ?? '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

// Alias en inglés derivados del MISMO en.json que usa la UI: si alguien reexporta en locale en
// y reimporta, el valor vuelve a su canónico. Derivarlo en vez de repetir las 16 traducciones
// es lo que impide que se desincronicen.
const EN_ALIASES: Record<string, Specialty> = Object.fromEntries(
  SPECIALTIES.map(s => [fold((enJson as Record<string, string>)[SPECIALTY_LABEL_KEY[s]]), s]),
)

// Resuelve un texto libre a una especialidad del dominio. null = no reconocida; el import la
// deja vacía en vez de inventar una.
export function canonicalSpecialty(raw: string): Specialty | null {
  const v = fold(raw)
  if (!v) return null
  return SPECIALTIES.find(s => fold(s) === v) ?? EN_ALIASES[v] ?? null
}

// Candidatos del botón "Derivar especialidades faltantes": los que tienen NCT# (hay ficha que
// consultar) y todavía no tienen especialidad. Genérico sobre la forma mínima del lead para no
// depender de ../types, que a su vez importa el tipo Specialty de acá.
//
// Ya tener 'Otras' cuenta como tener especialidad: es un juicio que hizo una persona y volver a
// derivarlo se lo desharía en cada corrida.
export function pendingSpecialty<T extends { nct_number?: string; especialidad?: string | null }>(leads: T[]): T[] {
  return leads.filter(l => (l.nct_number || '').trim() && !(l.especialidad || '').trim())
}

// Etiqueta traducida de una especialidad. Cae al literal crudo si no está en el dominio —
// mismo criterio que `stageLabel` con las etapas legacy: si la DB tiene algo que el código no
// conoce, se muestra, no se esconde.
export function specialtyLabel(v: string | null | undefined, t: (k: I18nKey) => string): string {
  const key = (SPECIALTY_LABEL_KEY as Record<string, I18nKey>)[v ?? '']
  return key ? t(key) : (v || '—')
}
