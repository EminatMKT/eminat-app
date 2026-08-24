import { describe, it, expect } from 'vitest'
import { specialtyFromMesh, canonicalSpecialty, pendingSpecialty, specialtyLabel, SPECIALTY, SPECIALTIES } from './specialty'
import type { I18nKey } from '@/shared/i18n'

// Los casos de abajo NO son inventados: son las respuestas reales de
// https://clinicaltrials.gov/api/v2/studies (relevadas el 18/08/2026 sobre 50 estudios
// RECRUITING con sponsor INDUSTRY). Ver la subsección "Averiguado el 18/08/2026" en
// docs/requerimientos-crm-research-2026-08-12.md.
const browse = (meshes: string[], ancestors: string[] = []) => ({
  meshes: meshes.map(term => ({ id: '', term })),
  ancestors: ancestors.map(term => ({ id: '', term })),
})

describe('specialtyFromMesh', () => {
  // El 44% de los estudios toca más de una raíz. Sin regla de prioridad, la especialidad
  // dependería del orden en que CT.gov devuelve los ancestros — o sea, sería azar.
  it('cáncer de mama es Oncología, aunque sus ancestros toquen también piel y endocrino', () => {
    const s = browse(
      ['Breast Neoplasms'],
      ['Neoplasms by Site', 'Neoplasms', 'Breast Diseases', 'Skin Diseases', 'Skin and Connective Tissue Diseases', 'Endocrine System Diseases'],
    )
    expect(specialtyFromMesh(s)).toBe(SPECIALTY.ONCOLOGIA)
  })

  it('una leucemia es Oncología, no Hematología: el cáncer gana sobre el órgano afectado', () => {
    const s = browse(
      ['Leukemia, Myeloid, Acute'],
      ['Leukemia', 'Neoplasms by Histologic Type', 'Neoplasms', 'Hematologic Diseases', 'Hemic and Lymphatic Diseases'],
    )
    expect(specialtyFromMesh(s)).toBe(SPECIALTY.ONCOLOGIA)
  })

  it('la diabetes tipo 1 es Endocrinología, y no Inmunología por ser autoinmune', () => {
    const s = browse(
      ['Diabetes Mellitus, Type 1'],
      ['Diabetes Mellitus', 'Glucose Metabolism Disorders', 'Metabolic Diseases', 'Nutritional and Metabolic Diseases', 'Endocrine System Diseases', 'Autoimmune Diseases', 'Immune System Diseases'],
    )
    expect(specialtyFromMesh(s)).toBe(SPECIALTY.ENDOCRINOLOGIA)
  })

  // Caso real (NCT05423860): la condición ya ES una raíz, así que llega sin ancestros propios.
  // Si solo miráramos `ancestors`, este estudio quedaría sin clasificar.
  it('reconoce la raíz cuando viene como término propio y no como ancestro', () => {
    expect(specialtyFromMesh(browse(['Cardiovascular Diseases']))).toBe(SPECIALTY.CARDIOLOGIA)
  })

  // El 24% medido: CT.gov tarda en catalogar los estudios recién registrados, que son
  // justo los que rastrea Royner. Ese hueco se llena a mano, no se adivina.
  it('sin MeSH devuelve null: no hay nada que derivar', () => {
    expect(specialtyFromMesh(browse([]))).toBeNull()
    expect(specialtyFromMesh({})).toBeNull()
  })

  // "Otras" es un juicio humano ("la miré y no encaja"), no algo que la máquina pueda afirmar.
  it('una raíz fuera del dominio devuelve null en vez de "Otras"', () => {
    expect(specialtyFromMesh(browse(['Toothache'], ['Stomatognathic Diseases']))).toBeNull()
  })

  it('las raíces genéricas no alcanzan para clasificar', () => {
    expect(specialtyFromMesh(browse(['Chronic Disease'], ['Pathological Conditions, Signs and Symptoms']))).toBeNull()
  })
})

// El valor entra también por el import de CSV: el Excel de Royner no va a tener las tildes
// ni el casing exactos, y el export en inglés reimportado traería "Oncology".
describe('canonicalSpecialty', () => {
  it('acepta el valor exacto del dominio', () => {
    expect(canonicalSpecialty('Oncología')).toBe(SPECIALTY.ONCOLOGIA)
  })

  it('tolera minúsculas y falta de tildes, que es como sale de una planilla', () => {
    expect(canonicalSpecialty('oncologia')).toBe(SPECIALTY.ONCOLOGIA)
    expect(canonicalSpecialty('  CARDIOLOGIA ')).toBe(SPECIALTY.CARDIOLOGIA)
  })

  it('acepta el nombre en inglés, que es lo que exporta la app en locale en', () => {
    expect(canonicalSpecialty('Oncology')).toBe(SPECIALTY.ONCOLOGIA)
    expect(canonicalSpecialty('Infectious Diseases')).toBe(SPECIALTY.INFECTOLOGIA)
  })

  it('lo que no está en el dominio es null: el import no inventa especialidades', () => {
    expect(canonicalSpecialty('Traumatología')).toBeNull()
    expect(canonicalSpecialty('')).toBeNull()
  })
})

// El dominio vive DOS veces: acá y en el CHECK de Postgres (la migración). Si se agrega una
// especialidad al TS y no a la constraint, el insert revienta en runtime con 23514 y recién se
// ve en producción. Este test es el que ata las dos copias.
describe('dominio TS ↔ CHECK de la migración', () => {
  it('toda especialidad del dominio está permitida por la constraint de la DB', async () => {
    const fs = await import('node:fs/promises')
    const sql = await fs.readFile('supabase/migrations/20260818170000_especialidad_research_leads.sql', 'utf8')
    const allowed = sql.slice(sql.indexOf('especialidad_check'))
    for (const s of SPECIALTIES) expect(allowed).toContain(`'${s}'::text`)
  })
})

// A quién le corresponde el botón "Derivar especialidades faltantes".
describe('pendingSpecialty', () => {
  const leads = [
    { id: '1', nct_number: 'NCT00000001' },
    { id: '2', nct_number: 'NCT00000002', especialidad: 'Cardiología' },
    { id: '3', nct_number: 'NCT00000003', especialidad: 'Otras' },
    { id: '4', official_title: 'Estudio sin NCT#' },
    { id: '5', nct_number: '   ', especialidad: '' },
  ]

  it('toma los que tienen NCT# y todavía no tienen especialidad', () => {
    expect(pendingSpecialty(leads).map(l => l.id)).toEqual(['1'])
  })

  it('no vuelve a tocar a los que ya tienen una, ni siquiera "Otras"', () => {
    // "Otras" es un juicio que ya hizo una persona: pisarlo con lo que diga el MeSH sería
    // deshacerle el trabajo cada vez que se aprieta el botón.
    expect(pendingSpecialty(leads).some(l => l.id === '3')).toBe(false)
  })

  it('ignora los leads sin NCT#: no hay ficha que consultar', () => {
    expect(pendingSpecialty(leads).some(l => l.id === '4' || l.id === '5')).toBe(false)
  })
})

// La tabla y la ficha muestran la especialidad traducida, no el literal guardado.
describe('specialtyLabel', () => {
  const t = ((k: string) => `[${k}]`) as (k: I18nKey) => string

  it('traduce el valor canónico', () => {
    expect(specialtyLabel(SPECIALTY.ONCOLOGIA, t)).toBe('[research.specialty.oncologia]')
  })

  it('sin especialidad muestra un guión, no una cadena vacía', () => {
    expect(specialtyLabel(null, t)).toBe('—')
    expect(specialtyLabel(undefined, t)).toBe('—')
  })

  // Mismo criterio que stageLabel con las etapas legacy: si la DB tiene un valor que el
  // dominio no conoce, se muestra crudo en vez de esconderlo.
  it('un valor desconocido se muestra tal cual', () => {
    expect(specialtyLabel('Traumatología', t)).toBe('Traumatología')
  })
})
