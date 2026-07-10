// Autocompletado de leads desde la API pública de ClinicalTrials.gov (v2).
// Endpoint sin auth y con CORS abierto (access-control-allow-origin: *) → fetch directo
// desde el browser. Devuelve un parcial con COLUMNAS REALES de research_leads, listo para
// mergear en el form. Errores como clave i18n (research.nct.*).
import type { I18nKey } from '@/shared/i18n'
import { NCT_COLUMN, NCT_RE, CLINICAL_TRIALS_BASE, normNct } from './constants'

const PHASE_MAP: Record<string, string> = { EARLY_PHASE1: 'Early Phase 1', PHASE1: 'Phase 1', PHASE2: 'Phase 2', PHASE3: 'Phase 3', PHASE4: 'Phase 4', NA: 'N/A' }
const STATUS_MAP: Record<string, string> = { RECRUITING: 'Recruiting', NOT_YET_RECRUITING: 'Not yet recruiting', ENROLLING_BY_INVITATION: 'Enrolling by invitation', ACTIVE_NOT_RECRUITING: 'Active, not recruiting', COMPLETED: 'Completed', SUSPENDED: 'Suspended', TERMINATED: 'Terminated', WITHDRAWN: 'Withdrawn', UNKNOWN: 'Unknown status' }
const TYPE_MAP: Record<string, string> = { INTERVENTIONAL: 'Interventional', OBSERVATIONAL: 'Observational', EXPANDED_ACCESS: 'Expanded Access' }

const prettify = (s: string) => (s ? s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, ' ') : s)

// Las fechas de CT.gov pueden venir con precisión de mes/año; la columna es `date` → completar.
function normDate(d?: string): string | undefined {
  if (!d) return undefined
  if (/^\d{4}$/.test(d)) return `${d}-01-01`
  if (/^\d{4}-\d{2}$/.test(d)) return `${d}-01`
  return d
}

export type NctResult = { study?: Record<string, any>; error?: I18nKey }
export type TitleResult = { studies?: Record<string, any>[]; error?: I18nKey }

// Mapea un protocolSection de CT.gov a un parcial con COLUMNAS REALES de research_leads,
// descartando vacíos (el merge no debe pisar con strings vacíos). Reusado por NCT# y título.
export function studyFromProtocol(p: any): Record<string, any> {
  const idm = p.identificationModule || {}, st = p.statusModule || {}, des = p.designModule || {}
  const cond = p.conditionsModule || {}, spo = p.sponsorCollaboratorsModule || {}, loc = p.contactsLocationsModule || {}, desc = p.descriptionModule || {}
  const lead = spo.leadSponsor || {}
  const countries = Array.from(new Set(((loc.locations || []) as any[]).map(l => l.country).filter(Boolean))).sort()

  const study: Record<string, any> = {
    [NCT_COLUMN]: idm.nctId,
    official_title: idm.officialTitle || idm.briefTitle,
    brief_explanation: desc.briefSummary,
    conditions: (cond.conditions || []).join(', '),
    phase: (des.phases || []).map((x: string) => PHASE_MAP[x] || prettify(x)).join(', '),
    study_type: TYPE_MAP[des.studyType] || prettify(des.studyType || ''),
    recruitment_status: STATUS_MAP[st.overallStatus] || prettify(st.overallStatus || ''),
    study_start_date: normDate(st.startDateStruct?.date),
    primary_completion_date: normDate(st.primaryCompletionDateStruct?.date),
    lead_sponsor: lead.name,
    sponsor_type: prettify(lead.class || ''),
    countries: countries.join(', '),
    record_link: idm.nctId ? `${CLINICAL_TRIALS_BASE}/study/${idm.nctId}` : undefined,
  }
  for (const k of Object.keys(study)) if (study[k] === '' || study[k] == null) delete study[k]
  return study
}

export async function fetchStudyByNCT(nctRaw: string): Promise<NctResult> {
  const nct = normNct(nctRaw)
  if (!NCT_RE.test(nct)) return { error: 'research.nct.invalid' }

  let res: Response
  try {
    res = await fetch(`${CLINICAL_TRIALS_BASE}/api/v2/studies/${nct}?fields=protocolSection`)
  } catch {
    return { error: 'research.nct.error' }
  }
  if (res.status === 404) return { error: 'research.nct.notFound' }
  if (!res.ok) return { error: 'research.nct.error' }

  let json: any
  try { json = await res.json() } catch { return { error: 'research.nct.error' } }
  return { study: studyFromProtocol(json.protocolSection || {}) }
}

// Busca estudios por título en CT.gov (query.titles). Devuelve hasta 5 candidatos mapeados
// para que el usuario elija cuál es su estudio (útil en leads sin NCT#). Errores research.title.*.
export async function fetchStudiesByTitle(titleRaw: string): Promise<TitleResult> {
  const title = (titleRaw || '').trim()
  if (title.length < 8) return { error: 'research.title.tooShort' }

  const url = `${CLINICAL_TRIALS_BASE}/api/v2/studies?query.titles=${encodeURIComponent(title)}&pageSize=5&fields=protocolSection`
  let res: Response
  try { res = await fetch(url) } catch { return { error: 'research.title.error' } }
  if (!res.ok) return { error: 'research.title.error' }

  let json: any
  try { json = await res.json() } catch { return { error: 'research.title.error' } }
  const studies = ((json.studies || []) as any[]).map(s => studyFromProtocol(s.protocolSection || {})).filter(s => s[NCT_COLUMN])
  return { studies }
}

// Separa lo que trae CT.gov en: `fills` (campos vacíos en el lead → rellenar sin preguntar)
// y `conflicts` (campos con valor distinto → el usuario elige cuáles pisar). nct_number
// siempre va a fills (solo se normaliza el casing del NCT que el usuario acaba de tipear).
export type StudyConflict = { column: string; current: any; incoming: any }
export function splitStudyMerge(current: Record<string, any>, study: Record<string, any>) {
  const fills: Record<string, any> = {}
  const conflicts: StudyConflict[] = []
  for (const col of Object.keys(study)) {
    const cur = current[col]
    if (col === NCT_COLUMN || cur === undefined || cur === null || cur === '') { fills[col] = study[col]; continue }
    if (String(cur) !== String(study[col])) conflicts.push({ column: col, current: cur, incoming: study[col] })
  }
  return { fills, conflicts }
}
