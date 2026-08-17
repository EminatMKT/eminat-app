'use client'
import { useMemo, useState } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import { RESEARCH_THEME, inputStyle } from '../../theme'
import { LEAD_FIELD_DEFS, DOMAIN_FIELDS, domainOptions, normalizeDomainValue } from '../../utils/fields'
import { detectSeparator, parseDelimited } from '@/shared/lib/delimited'
import { guessMapping, indexByNct, buildImportPlan, planCounterChanges, stripCounterFor, type DupMode, type ValueMap } from '../../utils/importPlan'
import { useResearch } from '../ResearchContext'
import CounterChangeRow from './CounterChangeRow'

const SEP_OPTIONS = [
  { value: ',', labelKey: 'research.import.sep.comma' },
  { value: ';', labelKey: 'research.import.sep.semicolon' },
  { value: '\t', labelKey: 'research.import.sep.tab' },
  { value: ':', labelKey: 'research.import.sep.colon' },
] as const

type DomainVal = { raw: string; guess: string; resolved: boolean }

export default function ImportModal() {
  const { s1, s2, border, t1, t2, t3, accent, warn } = RESEARCH_THEME
  const { mostrarMensaje } = useApp()
  const { t } = useT()
  const { modalImport, setModalImport, confirmImport, leads } = useResearch()
  const [raw, setRaw] = useState<string | null>(null)
  const [sep, setSep] = useState(',')
  const [mapping, setMapping] = useState<(string | null)[]>([])
  const [dupMode, setDupMode] = useState<DupMode>('update')
  const [valueMap, setValueMap] = useState<ValueMap>({}) // override manual de valores de dominio
  // Leads cuyo contador el usuario decidió NO pisar (destildados en el preview).
  const [keepCount, setKeepCount] = useState<Set<string>>(new Set())
  // Todos los hooks van ANTES de cualquier return condicional (Rules of Hooks):
  // si el early-return quedara en medio, abrir el modal renderiza más hooks que el
  // render previo → "Rendered more hooks than during the previous render".
  const parsed = useMemo(() => (raw ? parseDelimited(raw, sep) : { headers: [], rows: [] }), [raw, sep])
  const existingByNct = useMemo(() => indexByNct(leads), [leads])
  const plan = useMemo(
    () => buildImportPlan({ rows: parsed.rows, mapping, existingByNct, dupMode, valueMap }),
    [parsed.rows, mapping, existingByNct, dupMode, valueMap],
  )
  // El contador tiene dos escritores (pop-up y este import): antes de pisar, mostrar qué
  // cambia y dejar destildarlo. El plan que se ejecuta es el ya filtrado, no `plan`.
  const countById = useMemo(() => new Map(leads.map(l => [l.id, l.email_count ?? null])), [leads])
  const counterChanges = useMemo(() => planCounterChanges(plan, countById), [plan, countById])
  const finalPlan = useMemo(() => stripCounterFor(plan, keepCount), [plan, keepCount])

  // Por cada columna de dominio mapeada, los valores distintos entrantes y su canónico
  // auto-sugerido (mismo tratamiento que el mapeo de encabezados, un nivel más abajo).
  const domainGroups = useMemo(() => {
    const domainCols = new Set(DOMAIN_FIELDS.map(f => f.column))
    const done = new Set<string>()
    const groups: { column: string; values: DomainVal[] }[] = []
    mapping.forEach((col, i) => {
      if (!col || !domainCols.has(col) || done.has(col)) return
      done.add(col)
      const seen = new Set<string>()
      const values: DomainVal[] = []
      for (const row of parsed.rows) {
        const rawv = (row[i] ?? '').trim()
        if (!rawv || seen.has(rawv)) continue
        seen.add(rawv)
        const norm = normalizeDomainValue(col, rawv)
        values.push({ raw: rawv, guess: norm ?? '', resolved: norm !== null })
      }
      if (values.length) groups.push({ column: col, values })
    })
    return groups
  }, [mapping, parsed.rows])
  if (!modalImport) return null

  const close = () => { setModalImport(false); setRaw(null); setMapping([]); setSep(','); setDupMode('update'); setValueMap({}); setKeepCount(new Set()) }
  const setValue = (col: string, rawv: string, canonical: string) =>
    setValueMap(m => ({ ...m, [col]: { ...m[col], [rawv]: canonical } }))
  const unresolved = domainGroups.reduce((n, g) => n + g.values.filter(v => !v.resolved && !(valueMap[g.column]?.[v.raw])).length, 0)

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const lines = text.replace(/\r\n?/g, '\n').split('\n').filter(l => l.trim())
    if (lines.length < 2) { mostrarMensaje('error', t('research.import.empty')); return }
    const detected = detectSeparator(lines[0])
    setValueMap({})
    setRaw(text); setSep(detected); setMapping(guessMapping(parseDelimited(text, detected).headers))
  }

  // Cambiar el separador re-parsea y re-adivina el mapeo (las columnas cambian).
  function changeSep(newSep: string) {
    setSep(newSep)
    if (raw) setMapping(guessMapping(parseDelimited(raw, newSep).headers))
  }

  const canImport = parsed.rows.length > 0 && mapping.some(Boolean)

  async function doImport() {
    if (!canImport) { mostrarMensaje('error', t('research.import.noColumns')); return }
    if (await confirmImport(finalPlan)) close()
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
              <button onClick={() => { setRaw(null); setMapping([]); setValueMap({}) }} style={{ marginLeft: 'auto', background: 'none', border: `1px solid ${border}`, borderRadius: 8, color: t3, fontSize: 11, padding: '4px 10px', cursor: 'pointer' }}>{t('research.import.selectFile')}</button>
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

            {/* CONTADORES A PISAR */}
            {counterChanges.length > 0 && (
              <>
                <div style={sectionTitle}>{t('research.import.counterSection')}</div>
                <div style={{ fontSize: 11, color: warn, marginBottom: 8 }}>{t('research.import.counterWarning', { n: counterChanges.length })}</div>
                <div style={{ maxHeight: 160, overflowY: 'auto', border: `1px solid ${border}`, borderRadius: 10 }}>
                  {counterChanges.map(c => (
                    <CounterChangeRow key={c.id} change={c} apply={!keepCount.has(c.id)}
                      onToggle={() => setKeepCount(prev => {
                        const next = new Set(prev)
                        next.has(c.id) ? next.delete(c.id) : next.add(c.id)
                        return next
                      })} />
                  ))}
                </div>
              </>
            )}

            {/* DUPLICADOS */}
            <div style={sectionTitle}>{t('research.import.dupSection')}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 12, color: t3, minWidth: 90 }}>{t('research.import.dupLabel')}</span>
              <select value={dupMode} onChange={e => setDupMode(e.target.value as DupMode)} style={{ ...inputStyle, maxWidth: 220 }}>
                <option value="update">{t('research.import.dup.update')}</option>
                <option value="skip">{t('research.import.dup.skip')}</option>
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
            {/* VALORES DE DOMINIO — mismo patrón que el mapeo, pero valor→dominio */}
            {domainGroups.length > 0 && (
              <>
                <div style={sectionTitle}>{t('research.import.valuesSection')}</div>
                {domainGroups.map(g => {
                  const opts = domainOptions(g.column) ?? []
                  const labelKey = LEAD_FIELD_DEFS.find(f => f.column === g.column)!.labelKey
                  return (
                    <div key={g.column} style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 11, color: t3, fontWeight: 700, marginBottom: 4 }}>{t(labelKey)}</div>
                      {g.values.map(v => {
                        const current = valueMap[g.column]?.[v.raw] ?? v.guess
                        return (
                          <div key={v.raw} style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 4 }}>
                            <div style={{ flex: 1, fontSize: 12, color: t2, fontFamily: 'DM Mono', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.raw}{!v.resolved && ' ⚠'}</div>
                            <span style={{ color: t3 }}>→</span>
                            <select value={current} onChange={e => setValue(g.column, v.raw, e.target.value)} style={{ ...inputStyle, flex: 1, borderColor: current ? undefined : warn }}>
                              <option value="">{t('research.import.valueEmpty')}</option>
                              {opts.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
                {unresolved > 0 && (
                  <div style={{ fontSize: 11, color: warn, marginTop: 2 }}>{t('research.import.unresolvedNote', { n: unresolved })}</div>
                )}
              </>
            )}

            <div style={{ fontSize: 12, color: accent, marginTop: 12, fontWeight: 600 }}>
              {t('research.import.summary', { ins: finalPlan.toInsert.length, upd: finalPlan.toUpdate.length, skip: finalPlan.skipped })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
