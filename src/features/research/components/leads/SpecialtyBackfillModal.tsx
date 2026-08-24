'use client'
import { useState } from 'react'
import { RESEARCH_THEME } from '../../theme'
import { useT } from '@/shared/i18n'
import { useApp } from '@/shared/context/AppContext'
import { useResearch } from '../ResearchContext'
import { pendingSpecialty } from '../../utils/specialty'
import SpecialtyMatchRow from './SpecialtyMatchRow'
import type { SpecialtyScan } from '../../hooks/useResearchData'

// Backfill de especialidad de los leads ya cargados. Consulta ClinicalTrials.gov, MUESTRA lo que
// derivó, y recién guarda si una persona confirma: derivar de MeSH es una inferencia, no un
// hecho, y acá se aplica sobre decenas de filas de una sola vez.
//
// Que sea un botón de la app y no un script de un solo uso es deliberado (convención del
// proyecto: los datos entran por el frontend). Así el backfill dobla como QA del flujo y queda
// disponible cada vez que entren leads nuevos, no solo hoy.
export default function SpecialtyBackfillModal() {
  const { s1, s2, border, t1, t2, t3, accent } = RESEARCH_THEME
  const { t } = useT()
  const { mostrarMensaje } = useApp()
  const { leads, modalSpecialty, setModalSpecialty, scanSpecialties, applySpecialties } = useResearch()
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [scan, setScan] = useState<SpecialtyScan | null>(null)
  const [saving, setSaving] = useState(false)

  if (!modalSpecialty) return null
  const pending = pendingSpecialty(leads)
  const close = () => { if (!progress && !saving) { setScan(null); setModalSpecialty(false) } }

  async function run() {
    setProgress({ done: 0, total: pending.length })
    const result = await scanSpecialties((done, total) => setProgress({ done, total }))
    setProgress(null)
    setScan(result)
  }

  async function save() {
    if (!scan?.found.length) return
    setSaving(true)
    const ok = await applySpecialties(scan.found)
    setSaving(false)
    if (ok) {
      mostrarMensaje('ok', t('research.specialtyScan.applied', { n: scan.found.length }))
      setScan(null)
      setModalSpecialty(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={close}>
      <div onClick={e => e.stopPropagation()} style={{ background: s1, border: `1px solid ${border}`, borderRadius: 18, padding: 28, width: 560, maxWidth: '95vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 800, color: t1 }}>{t('research.specialtyScan.title')}</div>
          <button onClick={close} style={{ background: 'none', border: 'none', color: t3, fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ fontSize: 11, color: t3, lineHeight: 1.6, marginBottom: 18 }}>{t('research.specialtyScan.intro')}</div>

        {!scan && !progress && (
          pending.length === 0
            ? <div style={{ background: s2, border: `1px solid ${border}`, borderRadius: 12, padding: 16, fontSize: 12, color: t2 }}>{t('research.specialtyScan.nonePending')}</div>
            : <button onClick={run} style={{ width: '100%', padding: 12, borderRadius: 10, background: accent, color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {t('research.specialtyScan.start', { n: pending.length })}
              </button>
        )}

        {progress && (
          <div style={{ background: s2, border: `1px solid ${border}`, borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 12, color: t2, marginBottom: 10 }}>{t('research.specialtyScan.scanning', { done: progress.done, total: progress.total })}</div>
            <div style={{ height: 6, borderRadius: 3, background: border, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%`, background: accent, transition: 'width .2s' }} />
            </div>
          </div>
        )}

        {scan && (
          <div style={{ overflowY: 'auto', flex: 1 }}>
            <div style={{ fontSize: 10, color: accent, textTransform: 'uppercase', letterSpacing: '.1em', fontFamily: 'DM Mono', margin: '4px 0 8px' }}>
              {t('research.specialtyScan.foundTitle', { n: scan.found.length })}
            </div>
            {scan.found.map(m => <SpecialtyMatchRow key={m.id} match={m} />)}

            {scan.missing.length > 0 && (
              <>
                <div style={{ fontSize: 10, color: t3, textTransform: 'uppercase', letterSpacing: '.1em', fontFamily: 'DM Mono', margin: '18px 0 8px' }}>
                  {t('research.specialtyScan.missingTitle', { n: scan.missing.length })}
                </div>
                <div style={{ fontSize: 10, color: t3, lineHeight: 1.6, marginBottom: 8 }}>{t('research.specialtyScan.missingHint')}</div>
                <div style={{ fontFamily: 'DM Mono', fontSize: 10, color: t3, lineHeight: 1.8 }}>{scan.missing.map(m => m.nct).join(' · ')}</div>
              </>
            )}
          </div>
        )}

        {scan && (
          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <button onClick={close} style={{ flex: 1, padding: 10, borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 13, cursor: 'pointer' }}>{t('research.common.cancel')}</button>
            <button onClick={save} disabled={saving || scan.found.length === 0}
              style={{ flex: 2, padding: 10, borderRadius: 10, background: scan.found.length ? accent : `${accent}55`, color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: scan.found.length ? 'pointer' : 'not-allowed' }}>
              {t('research.specialtyScan.apply', { n: scan.found.length })}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
