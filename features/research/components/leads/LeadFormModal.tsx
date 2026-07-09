'use client'
import { RESEARCH_THEME } from '../../theme'
import { useT } from '@/shared/i18n'
import { LEAD_FIELD_DEFS, LEAD_GROUPS, GROUP_LABEL_KEY } from '../../fields'
import { useResearch } from '../ResearchContext'
import LeadFormField from './LeadFormField'

export default function LeadFormModal() {
  const { s1, border, t1, t2, t3, accent } = RESEARCH_THEME
  const { t } = useT()
  const { modalNewLead, newLead, setNewLead, editingLead, closeLeadForm, saveLead } = useResearch()
  if (!modalNewLead) return null

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
                <LeadFormField key={def.column} def={def} value={newLead[def.column]} onChange={v => setNewLead((p: any) => ({ ...p, [def.column]: v }))} />
              ))}
            </div>
          </div>
        ))}

        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button onClick={closeLeadForm} style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 13, cursor: 'pointer' }}>{t('common.cancel')}</button>
          <button onClick={async () => { const ok = await saveLead(newLead); if (ok) closeLeadForm() }} style={{ flex: 2, padding: '10px', borderRadius: 10, background: accent, color: 'white', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{t(editingLead ? 'research.form.save' : 'research.form.create')}</button>
        </div>
      </div>
    </div>
  )
}
