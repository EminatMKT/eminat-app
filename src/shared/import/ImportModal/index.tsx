'use client'
import { useMemo, useState, type ChangeEvent, type ReactNode } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { useT, type I18nKey } from '@/shared/i18n'
import { detectSeparator, parseDelimited } from '@/shared/utils'
import Modal from '@/shared/components/ui/Modal'
import type { ImportPlan } from '../identity'
import MappingRow from '../MappingRow'
import DomainValueRow from '../DomainValueRow'
import DroppedHeaderChip from '../DroppedHeaderChip'
import PreviewRow from '../PreviewRow'
import s from './index.module.css'

// Modal de import genérico: lee un CSV/TSV, mapea sus columnas a un catálogo de campos,
// resuelve valores de dominio, arma un plan de insert/update y lo ejecuta. No sabe qué es un
// lead ni un paciente — todo el dominio entra por props (catálogo, identidad vía `buildPlan`,
// callbacks). Nació con Research (`features/research/components/leads/LeadImportModal`); el
// contador con dos escritores que Research necesita antes de confirmar vive ahí, no acá —
// entra por `renderExtra`/`transformPlan`, los únicos dos slots que este primer consumidor pidió.
export type ImportFieldDef = { column: string; labelKey: I18nKey }
export type DupMode = 'update' | 'skip'
export type ValueMap = Record<string, Record<string, string>>

const SEP_OPTIONS = [
  { value: ',', labelKey: 'import.sep.comma' },
  { value: ';', labelKey: 'import.sep.semicolon' },
  { value: '\t', labelKey: 'import.sep.tab' },
  { value: ':', labelKey: 'import.sep.colon' },
] as const satisfies readonly { value: string; labelKey: I18nKey }[]

type DomainVal = { raw: string; guess: string; resolved: boolean }

// Tipo aparte y no inline en la firma: `Promise<boolean>` pegado a la flecha de una función
// en la misma línea confunde al hook de i18n, que lo lee como si fuera texto JSX.
type ConfirmResult = boolean | Promise<boolean>

type Props<P extends ImportPlan> = {
  open: boolean
  title: string
  fieldDefs: ImportFieldDef[]
  domainOptions: (column: string) => string[] | undefined
  normalizeDomainValue: (column: string, raw: string) => string | null
  guessMapping: (headers: string[]) => (string | null)[]
  computeDropped: (headers: string[], mapping: (string | null)[]) => string[]
  buildPlan: (rows: string[][], mapping: (string | null)[], dupMode: DupMode, valueMap: ValueMap) => P
  // Sección que un módulo cuelga entre "columnas descartadas" y "duplicados" — Research la usa
  // para el preview de contadores a pisar. Recibe el plan TAL COMO SALIÓ de `buildPlan`, antes
  // de `transformPlan`.
  renderExtra?: (plan: P) => ReactNode
  // Transforma el plan antes de ejecutarlo (Research saca de acá el contador de los leads
  // desmarcados en `renderExtra`). Sin esto, se ejecuta el mismo plan que arma `buildPlan`.
  transformPlan?: (plan: P) => P
  onConfirm: (plan: P) => ConfirmResult
  onClose: () => void
}

export default function ImportModal<P extends ImportPlan = ImportPlan>({
  open, title, fieldDefs, domainOptions, normalizeDomainValue, guessMapping, computeDropped,
  buildPlan, renderExtra, transformPlan, onConfirm, onClose,
}: Props<P>) {
  const { mostrarMensaje } = useApp()
  const { t } = useT()
  const [raw, setRaw] = useState<string | null>(null)
  const [sep, setSep] = useState(',')
  const [mapping, setMapping] = useState<(string | null)[]>([])
  const [dupMode, setDupMode] = useState<DupMode>('update')
  const [valueMap, setValueMap] = useState<ValueMap>({}) // override manual de valores de dominio

  // Todos los hooks van ANTES de cualquier return condicional (Rules of Hooks): si el
  // early-return quedara en medio, abrir el modal renderiza más hooks que el render previo →
  // "Rendered more hooks than during the previous render".
  const parsed = useMemo(() => (raw ? parseDelimited(raw, sep) : { headers: [], rows: [] }), [raw, sep])
  const dropped = useMemo(() => computeDropped(parsed.headers, mapping), [parsed.headers, mapping, computeDropped])
  const plan = useMemo(() => buildPlan(parsed.rows, mapping, dupMode, valueMap), [parsed.rows, mapping, dupMode, valueMap, buildPlan])
  const finalPlan = useMemo(() => (transformPlan ? transformPlan(plan) : plan), [plan, transformPlan])

  // Por cada columna de dominio mapeada, los valores distintos entrantes y su canónico
  // auto-sugerido (mismo tratamiento que el mapeo de encabezados, un nivel más abajo).
  const domainGroups = useMemo(() => {
    const done = new Set<string>()
    const groups: { column: string; values: DomainVal[] }[] = []
    mapping.forEach((col, i) => {
      if (!col || done.has(col) || domainOptions(col) === undefined) return
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
  }, [mapping, parsed.rows, domainOptions, normalizeDomainValue])
  if (!open) return null

  const close = () => { setRaw(null); setMapping([]); setSep(','); setDupMode('update'); setValueMap({}); onClose() }
  const setValue = (col: string, rawv: string, canonical: string) =>
    setValueMap(m => ({ ...m, [col]: { ...m[col], [rawv]: canonical } }))
  const unresolved = domainGroups.reduce((n, g) => n + g.values.filter(v => !v.resolved && !(valueMap[g.column]?.[v.raw])).length, 0)

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const lines = text.replace(/\r\n?/g, '\n').split('\n').filter(l => l.trim())
    if (lines.length < 2) { mostrarMensaje('error', t('import.empty')); return }
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
    if (!canImport) { mostrarMensaje('error', t('import.noColumns')); return }
    if (await onConfirm(finalPlan)) close()
  }

  return (
    <Modal width={680} onClose={close}>
      {/* Encabezado propio y no el de Modal: acá lleva un segundo botón (Importar) además
          de la X, y Modal solo tiene slot para el título. */}
      <div className={s.head}>
        <div className={s.titulo}>{title}</div>
        <div className={s.headActions}>
          {raw && <button type="button" onClick={doImport} disabled={!canImport} className={s.importBtn}>{t('import.button')}</button>}
          <button type="button" onClick={close} className={s.cerrar}>✕</button>
        </div>
      </div>

      {!raw ? (
        <div className={s.dropzone}>
          <div className={s.dropzoneIcon}>📄</div>
          <div className={s.dropzoneHint}>{t('import.selectFile')}</div>
          <input type="file" accept=".csv,.tsv,.txt" onChange={onFile} className={s.fileInput} />
        </div>
      ) : (
        <>
          {/* ARCHIVO */}
          <div className={s.sectionTitle}>{t('import.fileSection')}</div>
          <div className={s.fileRow}>
            <span className={s.fileLabel}>{t('import.separator')}</span>
            <select value={sep} onChange={e => changeSep(e.target.value)} className={`${s.select} ${s.selectNarrow}`}>
              {SEP_OPTIONS.map(o => <option key={o.value} value={o.value}>{t(o.labelKey)}</option>)}
            </select>
            <span className={s.rowsDetected}>{t('import.rowsDetected', { n: parsed.rows.length })}</span>
            <button type="button" onClick={() => { setRaw(null); setMapping([]); setValueMap({}) }} className={s.changeFile}>{t('import.selectFile')}</button>
          </div>
          <div className={s.previewTableWrap}>
            <table className={s.previewTable}>
              <thead><tr className={s.previewHeadRow}>
                {parsed.headers.slice(0, 6).map((h, i) => <th key={i} className={s.previewHeadCell}>{h}</th>)}
              </tr></thead>
              <tbody>{parsed.rows.slice(0, 5).map((r, i) => <PreviewRow key={i} cells={r.slice(0, 6)} />)}</tbody>
            </table>
          </div>

          {/* COLUMNAS DESCARTADAS */}
          {dropped.length > 0 && (
            <>
              <div className={s.sectionTitle}>{t('import.ignoredSection')}</div>
              <div className={s.warnText}>{t('import.ignoredNote', { n: dropped.length })}</div>
              <div className={s.chips}>
                {dropped.map(h => <DroppedHeaderChip key={h} header={h} />)}
              </div>
            </>
          )}

          {renderExtra?.(plan)}

          {/* DUPLICADOS */}
          <div className={s.sectionTitle}>{t('import.dupSection')}</div>
          <div className={s.fileRow}>
            <span className={s.fileLabel}>{t('import.dupLabel')}</span>
            <select value={dupMode} onChange={e => setDupMode(e.target.value as DupMode)} className={`${s.select} ${s.selectNarrow}`}>
              <option value="update">{t('import.dup.update')}</option>
              <option value="skip">{t('import.dup.skip')}</option>
            </select>
          </div>

          {/* MAPEO */}
          <div className={s.sectionTitle}>{t('import.mapSection')}</div>
          {parsed.headers.map((h, i) => (
            <MappingRow key={i} header={h} value={mapping[i] ?? null} fieldDefs={fieldDefs}
              onChange={v => setMapping(m => m.map((c, j) => (j === i ? v : c)))} />
          ))}

          {/* VALORES DE DOMINIO — mismo patrón que el mapeo, pero valor→dominio */}
          {domainGroups.length > 0 && (
            <>
              <div className={s.sectionTitle}>{t('import.valuesSection')}</div>
              {domainGroups.map(g => {
                const opts = domainOptions(g.column) ?? []
                const labelKey = fieldDefs.find(f => f.column === g.column)!.labelKey
                return (
                  <div key={g.column} className={s.domainGroup}>
                    <div className={s.domainGroupLabel}>{t(labelKey)}</div>
                    {g.values.map(v => (
                      <DomainValueRow key={v.raw} raw={v.raw} value={valueMap[g.column]?.[v.raw] ?? v.guess} resolved={v.resolved}
                        options={opts} onChange={val => setValue(g.column, v.raw, val)} />
                    ))}
                  </div>
                )
              })}
              {unresolved > 0 && <div className={s.warnTextTight}>{t('import.unresolvedNote', { n: unresolved })}</div>}
            </>
          )}

          <div className={s.summary}>
            {t('import.summary', { ins: finalPlan.toInsert.length, upd: finalPlan.toUpdate.length, skip: finalPlan.skipped })}
          </div>
        </>
      )}
    </Modal>
  )
}
