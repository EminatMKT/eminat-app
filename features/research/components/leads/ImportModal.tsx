'use client'
import { useMemo, useState } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import { RESEARCH_THEME, inputStyle } from '../../theme'
import { LEAD_FIELD_DEFS } from '../../fields'
import { detectSeparator, parseDelimited } from '../../delimited'
import { guessMapping, indexByNct, buildImportPlan, type DupMode } from '../../importPlan'
import { useResearch } from '../ResearchContext'

const SEP_OPTIONS = [
  { value: ',', labelKey: 'research.import.sep.comma' },
  { value: ';', labelKey: 'research.import.sep.semicolon' },
  { value: '\t', labelKey: 'research.import.sep.tab' },
  { value: ':', labelKey: 'research.import.sep.colon' },
] as const

export default function ImportModal() {
  const { s1, s2, border, t1, t2, t3, accent } = RESEARCH_THEME
  const { mostrarMensaje } = useApp()
  const { t } = useT()
  const { modalImport, setModalImport, confirmImport, leads } = useResearch()
  const [raw, setRaw] = useState<string | null>(null)
  const [sep, setSep] = useState(',')
  const [mapping, setMapping] = useState<(string | null)[]>([])
  const [dupMode, setDupMode] = useState<DupMode>('update')
  if (!modalImport) return null

  const close = () => { setModalImport(false); setRaw(null); setMapping([]); setSep(','); setDupMode('update') }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const lines = text.replace(/\r\n?/g, '\n').split('\n').filter(l => l.trim())
    if (lines.length < 2) { mostrarMensaje('error', t('research.import.empty')); return }
    const detected = detectSeparator(lines[0])
    setRaw(text); setSep(detected); setMapping(guessMapping(parseDelimited(text, detected).headers))
  }

  // Cambiar el separador re-parsea y re-adivina el mapeo (las columnas cambian).
  function changeSep(newSep: string) {
    setSep(newSep)
    if (raw) setMapping(guessMapping(parseDelimited(raw, newSep).headers))
  }

  const parsed = useMemo(() => (raw ? parseDelimited(raw, sep) : { headers: [], rows: [] }), [raw, sep])
  const existingByNct = useMemo(() => indexByNct(leads), [leads])
  const plan = useMemo(
    () => buildImportPlan({ rows: parsed.rows, mapping, existingByNct, dupMode }),
    [parsed.rows, mapping, existingByNct, dupMode],
  )
  const canImport = parsed.rows.length > 0 && mapping.some(Boolean)

  async function doImport() {
    if (!canImport) { mostrarMensaje('error', t('research.import.noColumns')); return }
    if (await confirmImport(plan)) close()
  }

  const sectionTitle = { fontSize: 11, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase' as const, color: accent, margin: '18px 0 10px' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={close}>
      <div onClick={e => e.stopPropagation()} style={{ background: s1, border: `1px solid ${border}`, borderRadius: 18, padding: 28, width: 680, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 800, color: t1 }}>{t('research.import.title')}</div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {raw && (
              <button onClick={doImport} disabled={!canImport} style={{ padding: '8px 18px', borderRadius: 10, background: accent, color: 'white', border: 'none', fontSize: 13, fontWeight: 600, cursor: canImport ? 'pointer' : 'default', opacity: canImport ? 1 : 0.5 }}>{t('research.import.button')}</button>
            )}
            <button onClick={close} style={{ background: 'none', border: 'none', color: t3, fontSize: 20, cursor: 'pointer' }}>✕</button>
          </div>
        </div>

        {!raw ? (
          <div style={{ border: `2px dashed ${border}`, borderRadius: 14, padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
            <div style={{ fontSize: 12, color: t3, marginBottom: 12 }}>{t('research.import.selectFile')}</div>
            <input type="file" accept=".csv,.tsv,.txt" onChange={onFile} style={{ fontSize: 12 }} />
          </div>
        ) : (
          <>
            {/* ARCHIVO */}
            <div style={sectionTitle}>{t('research.import.fileSection')}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: t3, minWidth: 90 }}>{t('research.import.separator')}</span>
              <select value={sep} onChange={e => changeSep(e.target.value)} style={{ ...inputStyle, maxWidth: 220 }}>
                {SEP_OPTIONS.map(o => <option key={o.value} value={o.value}>{t(o.labelKey)}</option>)}
              </select>
              <span style={{ fontSize: 11, color: t3 }}>{t('research.import.rowsDetected', { n: parsed.rows.length })}</span>
              <button onClick={() => { setRaw(null); setMapping([]) }} style={{ marginLeft: 'auto', background: 'none', border: `1px solid ${border}`, borderRadius: 8, color: t3, fontSize: 11, padding: '4px 10px', cursor: 'pointer' }}>{t('research.import.selectFile')}</button>
            </div>
            <div style={{ maxHeight: 180, overflow: 'auto', border: `1px solid ${border}`, borderRadius: 10 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                <thead><tr style={{ background: s2 }}>
                  {parsed.headers.slice(0, 6).map((h, i) => <th key={i} style={{ padding: '6px 8px', textAlign: 'left', color: t3, borderBottom: `1px solid ${border}`, whiteSpace: 'nowrap' }}>{h}</th>)}
                </tr></thead>
                <tbody>{parsed.rows.slice(0, 5).map((r, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${border}` }}>
                    {r.slice(0, 6).map((v, j) => <td key={j} style={{ padding: '5px 8px', color: t2, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</td>)}
                  </tr>
                ))}</tbody>
              </table>
            </div>

            {/* DUPLICADOS */}
            <div style={sectionTitle}>{t('research.import.dupSection')}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 12, color: t3, minWidth: 90 }}>{t('research.import.dupLabel')}</span>
              <select value={dupMode} onChange={e => setDupMode(e.target.value as DupMode)} style={{ ...inputStyle, maxWidth: 220 }}>
                <option value="update">{t('research.import.dup.update')}</option>
                <option value="skip">{t('research.import.dup.skip')}</option>
                <option value="duplicate">{t('research.import.dup.duplicate')}</option>
              </select>
            </div>

            {/* MAPEO */}
            <div style={sectionTitle}>{t('research.import.mapSection')}</div>
            {parsed.headers.map((h, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6 }}>
                <div style={{ flex: 1, fontSize: 12, color: t2, fontFamily: 'DM Mono', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h}</div>
                <span style={{ color: t3 }}>→</span>
                <select value={mapping[i] ?? ''} onChange={e => { const v = e.target.value || null; setMapping(m => m.map((c, j) => (j === i ? v : c))) }} style={{ ...inputStyle, flex: 1 }}>
                  <option value="">{t('research.import.ignore')}</option>
                  {LEAD_FIELD_DEFS.map(f => <option key={f.column} value={f.column}>{t(f.labelKey)}</option>)}
                </select>
              </div>
            ))}
            <div style={{ fontSize: 12, color: accent, marginTop: 12, fontWeight: 600 }}>
              {t('research.import.summary', { ins: plan.toInsert.length, upd: plan.toUpdate.length, skip: plan.skipped })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
