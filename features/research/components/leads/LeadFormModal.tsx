'use client'
import { useState } from 'react'
import { RESEARCH_THEME } from '../../theme'
import { useT } from '@/shared/i18n'
import { LEAD_FIELD_DEFS, LEAD_GROUPS, GROUP_LABEL_KEY, validateLeadFields } from '../../fields'
import type { I18nKey } from '@/shared/i18n'
import { fetchStudyByNCT, splitStudyMerge, type StudyConflict } from '../../clinicalTrials'
import { NCT_COLUMN, normNct } from '../../constants'
import type { Lead } from '../../types'
import { useResearch } from '../ResearchContext'
import LeadFormField from './LeadFormField'
import NctConflictModal from './NctConflictModal'

const LABEL_BY_COL = Object.fromEntries(LEAD_FIELD_DEFS.map(f => [f.column, f.labelKey]))

export default function LeadFormModal() {
  const { s1, border, t1, t2, t3, accent } = RESEARCH_THEME
  const { t } = useT()
  const { modalNewLead, newLead, setNewLead, editingLead, closeLeadForm, saveLead, leads, openEditLead } = useResearch()
  const [nctHint, setNctHint] = useState<React.ReactNode>(null)
  const [conflicts, setConflicts] = useState<StudyConflict[]>([])
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [errors, setErrors] = useState<Record<string, I18nKey>>({})
  const [nctDup, setNctDup] = useState<Lead | null>(null)
  if (!modalNewLead) return null

  function setField(column: string, v: any) {
    setNewLead((p: any) => ({ ...p, [column]: v }))
    if (errors[column]) setErrors(e => { const { [column]: _, ...rest } = e; return rest }) // limpiar error al editar
    if (column === NCT_COLUMN) setNctDup(null)
  }

  async function handleSave() {
    const errs = validateLeadFields(newLead)
    setErrors(errs)
    if (Object.keys(errs).length) return // errores por-campo, no en el header
    // NCT# es único: bloquear si otro lead ya lo tiene, con opción de abrirlo.
    const nct = normNct(newLead[NCT_COLUMN])
    if (nct) {
      const dup = leads.find((l: Lead) => l.id !== newLead.id && normNct(l.nct_number) === nct)
      if (dup) { setErrors({ [NCT_COLUMN]: 'research.validation.nctDuplicate' }); setNctDup(dup); return }
    }
    if (await saveLead(newLead)) closeLeadForm()
  }

  const openDup = () => { if (nctDup) { setNctDup(null); setErrors({}); openEditLead(nctDup) } }

  const filledHint = <span style={{ color: '#34D399' }}>✓ {t('research.nct.filled')}</span>

  // Autocompleta desde ClinicalTrials.gov al salir del campo NCT#.
  async function handleNctBlur() {
    const nct = (newLead[NCT_COLUMN] || '').trim()
    if (!nct) { setNctHint(null); return }
    setNctHint(<span style={{ color: t3 }}>{t('research.nct.searching')}</span>)
    const { study, error } = await fetchStudyByNCT(nct)
    if (error) { setNctHint(<span style={{ color: '#F87171' }}>{t(error)}</span>); return }
    const { fills, conflicts: conf } = splitStudyMerge(newLead, study)
    setNewLead((p: any) => ({ ...p, ...fills })) // vacíos: rellenar sin preguntar
    if (conf.length) {
      setConflicts(conf); setPicked(new Set()) // conflictos: el usuario elige cuáles pisar
      setNctHint(<span style={{ color: t3 }}>{t('research.nct.conflicts', { n: conf.length })}</span>)
    } else {
      setNctHint(filledHint)
    }
  }

  function applyPicked() {
    const patch: Record<string, any> = {}
    for (const c of conflicts) if (picked.has(c.column)) patch[c.column] = c.incoming
    setNewLead((p: any) => ({ ...p, ...patch }))
    setConflicts([]); setNctHint(filledHint)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={closeLeadForm}>
      <div onClick={e => e.stopPropagation()} style={{ background: s1, border: `1px solid ${border}`, borderRadius: 18, padding: 28, width: 640, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 800, color: t1 }}>{t(editingLead ? 'research.form.editLead' : 'research.form.newLead')}</div>
          <button onClick={closeLeadForm} style={{ background: 'none', border: 'none', color: t3, fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>

        {LEAD_GROUPS.map(group => (
          <div key={group} style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: accent, marginBottom: 10 }}>{t(GROUP_LABEL_KEY[group])}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {LEAD_FIELD_DEFS.filter(f => f.group === group).map(def => (
                <LeadFormField key={def.column} def={def} value={newLead[def.column]}
                  onChange={v => setField(def.column, v)}
                  onBlur={def.column === NCT_COLUMN ? handleNctBlur : undefined}
                  hint={def.column === NCT_COLUMN ? (nctDup
                    ? <button onClick={openDup} style={{ background: 'none', border: 'none', padding: 0, color: accent, fontSize: 10, fontWeight: 600, textDecoration: 'underline', cursor: 'pointer' }}>{t('research.form.openExisting')} →</button>
                    : nctHint) : undefined}
                  error={errors[def.column]} />
              ))}
            </div>
          </div>
        ))}

        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button onClick={closeLeadForm} style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 13, cursor: 'pointer' }}>{t('common.cancel')}</button>
          <button onClick={handleSave} style={{ flex: 2, padding: '10px', borderRadius: 10, background: accent, color: 'white', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{t(editingLead ? 'research.form.save' : 'research.form.create')}</button>
        </div>
      </div>

      {conflicts.length > 0 && (
        <NctConflictModal conflicts={conflicts} labelByCol={LABEL_BY_COL} picked={picked} setPicked={setPicked}
          onApply={applyPicked} onCancel={() => { setConflicts([]); setNctHint(filledHint) }} />
      )}
    </div>
  )
}
