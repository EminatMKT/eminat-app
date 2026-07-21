import { describe, it, expect } from 'vitest'
import * as research from './index'
import { EXPORT_HEADERS, leadColumnFor, validateLead, validateLeadFields, buildLeadPayload, normalizeDomainValue } from './fields'
import { fetchStudyByNCT, splitStudyMerge, studyFromProtocol } from './clinicalTrials'
import { PIPELINE_COLS, PIPELINE_ACTIVE_COLS, ARCHIVED_STAGE, DEFAULT_STAGE, STAGE, STAGE_LABEL_KEY, stageLabel } from './constants'

describe('features/research API pública', () => {
  it('expone ResearchModule', () => {
    expect(research.ResearchModule).toBeDefined()
  })
  it('declara su access (convención access-aware)', () => {
    expect(research.access).toEqual({ module: 'research' })
  })
})

describe('mapeo de columnas CSV (round-trip export<->import)', () => {
  it('traduce headers amigables a columnas reales de research_leads', () => {
    expect(leadColumnFor('email')).toBe('contact_email')
    expect(leadColumnFor('nct')).toBe('nct_number')
    expect(leadColumnFor('status')).toBe('recruitment_status')
    expect(leadColumnFor('next_followup')).toBe('next_followup_date')
  })
  it('acepta también la columna real y descarta desconocidas', () => {
    expect(leadColumnFor('contact_email')).toBe('contact_email')
    expect(leadColumnFor('columna_inexistente')).toBeNull()
  })
  it('todo header exportado round-trippea (el export no genera columnas fantasma)', () => {
    for (const h of EXPORT_HEADERS) expect(leadColumnFor(h)).toBeTruthy()
  })
})

describe('validateLead', () => {
  const base = { official_title: 'Estudio X', stage: DEFAULT_STAGE, nct_number: 'NCT01' }
  it('acepta un lead válido', () => {
    expect(validateLead(base)).toBeNull()
  })
  it('exige official_title y stage', () => {
    expect(validateLead({ ...base, official_title: '' })).toBe('research.validation.title')
    expect(validateLead({ ...base, stage: '' })).toBe('research.validation.stage')
  })
  it('exige NCT# o un contacto', () => {
    expect(validateLead({ official_title: 'X', stage: DEFAULT_STAGE })).toBe('research.validation.nctOrContact')
    expect(validateLead({ official_title: 'X', stage: DEFAULT_STAGE, contact_name: 'Dr. A' })).toBeNull()
  })
  it('valida formato de email y URL', () => {
    expect(validateLead({ ...base, contact_email: 'no-es-mail' })).toBe('research.validation.email')
    expect(validateLead({ ...base, record_link: 'ftp://x' })).toBe('research.validation.url')
    expect(validateLead({ ...base, contact_email: 'a@b.com', record_link: 'https://x.com' })).toBeNull()
  })
})

describe('validateLeadFields (errores por-campo, no en el header)', () => {
  it('devuelve mapa vacío si es válido', () => {
    expect(validateLeadFields({ official_title: 'X', stage: DEFAULT_STAGE, nct_number: 'NCT01' })).toEqual({})
  })
  it('ancla nct-o-contacto en nct_number cuando falta identificación', () => {
    expect(validateLeadFields({})).toEqual({
      official_title: 'research.validation.title',
      stage: 'research.validation.stage',
      nct_number: 'research.validation.nctOrContact',
    })
  })
  it('mapea el error de email a su propia columna', () => {
    // contact_email presente satisface nct-o-contacto; solo queda el error de formato
    expect(validateLeadFields({ official_title: 'X', stage: DEFAULT_STAGE, contact_email: 'malo' }))
      .toEqual({ contact_email: 'research.validation.email' })
  })
})

describe('fetchStudyByNCT (validación de formato, sin red)', () => {
  it('rechaza NCT# mal formado antes de tocar la red', async () => {
    expect(await fetchStudyByNCT('no-es-nct')).toEqual({ error: 'research.nct.invalid' })
    expect(await fetchStudyByNCT('')).toEqual({ error: 'research.nct.invalid' })
    expect(await fetchStudyByNCT('NCT123')).toEqual({ error: 'research.nct.invalid' })
  })
})

describe('studyFromProtocol (mapeo CT.gov → columnas)', () => {
  it('mapea nct/título/fase/tipo y descarta vacíos', () => {
    const s = studyFromProtocol({
      identificationModule: { nctId: 'NCT01', officialTitle: 'Estudio X' },
      designModule: { phases: ['PHASE2'], studyType: 'INTERVENTIONAL' },
      statusModule: { overallStatus: 'RECRUITING' },
    })
    expect(s.nct_number).toBe('NCT01')
    expect(s.official_title).toBe('Estudio X')
    expect(s.phase).toBe('Phase 2')
    expect(s.study_type).toBe('Interventional')
    expect(s.recruitment_status).toBe('Recruiting')
    expect(s.record_link).toBe('https://clinicaltrials.gov/study/NCT01')
    expect('conditions' in s).toBe(false) // vacío descartado
  })
})

describe('splitStudyMerge (autocompletado NCT# no destructivo)', () => {
  it('rellena vacíos, normaliza el nct_number, y aísla conflictos sin pisar', () => {
    const current = { nct_number: 'nct04', official_title: 'Título a mano', conditions: '', phase: 'Phase 2' }
    const study = { nct_number: 'NCT04', official_title: 'Official Title', conditions: 'Cancer', phase: 'Phase 2' }
    const { fills, conflicts } = splitStudyMerge(current, study)
    // vacío (conditions) y nct_number (siempre) → fills; phase igual → nada; official_title distinto → conflicto
    expect(fills).toEqual({ nct_number: 'NCT04', conditions: 'Cancer' })
    expect(conflicts).toEqual([{ column: 'official_title', current: 'Título a mano', incoming: 'Official Title' }])
  })
})

describe('normalizeDomainValue (valores de dominio en import)', () => {
  it('phase: números y multivalor → label canónico del dominio', () => {
    expect(normalizeDomainValue('phase', '2')).toBe('Phase 2')
    expect(normalizeDomainValue('phase', '1 & 2')).toBe('Phase 1/Phase 2')
    expect(normalizeDomainValue('phase', 'phase 3')).toBe('Phase 3') // match case-insensitive
    expect(normalizeDomainValue('phase', 'N/A')).toBe('N/A')
  })
  it('phase: combo inexistente en el dominio → null (no resuelto)', () => {
    expect(normalizeDomainValue('phase', '1 & 3')).toBeNull() // Phase 1/Phase 3 no está en PHASES
    expect(normalizeDomainValue('phase', 'abc')).toBeNull()
  })
  it('select estricto: case-insensitive al dominio; desconocido → null', () => {
    expect(normalizeDomainValue('study_type', 'interventional')).toBe('Interventional')
    expect(normalizeDomainValue('study_type', 'otro')).toBeNull()
  })
  it('vacío → "" y campo sin dominio → valor tal cual', () => {
    expect(normalizeDomainValue('phase', '')).toBe('')
    expect(normalizeDomainValue('official_title', 'Un título')).toBe('Un título')
  })
})

describe('buildLeadPayload', () => {
  it('solo emite columnas conocidas, con null en vacíos y boolean en checkbox', () => {
    const p = buildLeadPayload({ official_title: 'X', nct_number: '', spain_focus: 'true', campo_basura: 'z' })
    expect(p.official_title).toBe('X')
    expect(p.nct_number).toBeNull()
    expect(p.spain_focus).toBe(true)
    expect('campo_basura' in p).toBe(false)
  })
})

describe('etapas del CRM (constantes + display)', () => {
  // GOLDEN — hardcode INTENCIONAL: pin de los valores canónicos EXACTOS que se guardan en
  // research_leads.stage y a los que la migración manual mapea. Si cambian, es un breaking
  // change deliberado y este test se actualiza a conciencia. El resto de los tests usan las
  // constantes/tipos (STAGE / DEFAULT_STAGE / STAGE_LABEL_KEY), no literales sueltos.
  it('los valores canónicos son exactamente estos 4, en orden', () => {
    expect(PIPELINE_COLS).toEqual(['Nuevo', 'Contactado', 'Ganado', 'Sin respuesta'])
    expect(STAGE).toEqual({ NUEVO: 'Nuevo', CONTACTADO: 'Contactado', GANADO: 'Ganado', SIN_RESPUESTA: 'Sin respuesta' })
  })
  it('el archivado es una etapa real pero queda fuera del pipeline activo (Kanban/pie)', () => {
    expect(PIPELINE_COLS).toContain(ARCHIVED_STAGE)
    expect(PIPELINE_ACTIVE_COLS).toEqual([STAGE.NUEVO, STAGE.CONTACTADO, STAGE.GANADO])
    expect(PIPELINE_ACTIVE_COLS).not.toContain(ARCHIVED_STAGE)
  })
  it('el default de un lead nuevo es la primera etapa (Nuevo)', () => {
    expect(DEFAULT_STAGE).toBe(STAGE.NUEVO)
    expect(PIPELINE_COLS[0]).toBe(DEFAULT_STAGE)
  })
  it('cada etapa tiene una clave i18n de display', () => {
    for (const s of PIPELINE_COLS) expect(STAGE_LABEL_KEY[s]).toBeTruthy()
  })
  it('stageLabel traduce por clave y cae al literal crudo si no la hay', () => {
    const t = (k: string) => k // identidad: devuelve la clave (asignable a (k: I18nKey) => string)
    expect(stageLabel(STAGE.NUEVO, t)).toBe(STAGE_LABEL_KEY[STAGE.NUEVO]) // traduce por su clave i18n
    expect(stageLabel('EtapaLegacyVieja', t)).toBe('EtapaLegacyVieja')    // valor legacy sin clave → crudo
    expect(stageLabel(undefined, t)).toBe('—')                            // vacío → guion
  })
})
