'use client'
import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { useT, type I18nKey } from '@/shared/i18n'
import { detectSeparator, parseDelimited } from '@/shared/utils'
import Modal from '@/shared/components/ui/Modal'
import type { ImportPlan, SanitizeIssue, SourceWarning } from '../identity'
import { parseWorkbook, readSheet } from '../parseWorkbook'
import MappingRow from '../MappingRow'
import DomainValueRow from '../DomainValueRow'
import DroppedHeaderChip from '../DroppedHeaderChip'
import PreviewRow from '../PreviewRow'
import SheetPicker from '../SheetPicker'
import SanitizeRow from '../SanitizeRow'
import MergeCandidateRow, { type MergeCandidateDisplay } from '../MergeCandidateRow'
import s from './index.module.css'

// Modal de import genérico: lee un .xlsx (SheetJS) o un CSV/TSV, mapea sus columnas a un
// catálogo de campos, resuelve valores de dominio, sanea las filas con problemas, decide
// duplicados por similitud y arma un plan de insert/update. No sabe qué es un lead ni un
// paciente — todo el dominio entra por props (catálogo, identidad vía `buildPlan`, qué es una
// anomalía vía `detectAnomalies`, cómo se ve un candidato de fusión vía `resolveCandidate`,
// callbacks). Nació con Research (`features/research/components/leads/LeadImportModal`); los
// pasos 2 (hoja), 4 (saneamiento) y 5 (duplicados por similitud) los pidió Medical y quedaron acá
// porque son genéricos — ninguno conoce un paciente, solo re-empaquetan lo que `buildPlan`/
// `detectAnomalies`/`resolveCandidate` les dan.
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
type ParsedFile = { headers: string[]; rows: string[][] }
const EMPTY_PARSED: ParsedFile = { headers: [], rows: [] }

// Tipo aparte y no inline en la firma: `Promise<boolean>` pegado a la flecha de una función
// en la misma línea confunde al hook de i18n, que lo lee como si fuera texto JSX.
type ConfirmResult = boolean | Promise<boolean>

type Props<P extends ImportPlan> = {
  open: boolean
  title: string
  // '.xlsx' (workbook, SheetJS, con paso 2 de hoja) o '.csv,.tsv,.txt' (delimited, el original).
  accept: string
  kind: 'workbook' | 'delimited'
  fieldDefs: ImportFieldDef[]
  domainOptions: (column: string) => string[] | undefined
  normalizeDomainValue: (column: string, raw: string) => string | null
  guessMapping: (headers: string[]) => (string | null)[]
  computeDropped: (headers: string[], mapping: (string | null)[]) => string[]
  // Paso 4. Sin esto, el paso no se renderiza — Research no tiene anomalías que marcar.
  // `hoja` viaja a los tres (buildPlan, detectAnomalies, y quien construya la identidad):
  // es null en modo `delimited` (Research), y en `workbook` es la hoja elegida en el paso 2 —
  // Medical la necesita para saber de qué sistema es la fila (`fuenteDeHoja`), algo que ni
  // `rows` ni `mapping` cargan por sí solos.
  detectAnomalies?: (rows: string[][], mapping: (string | null)[], hoja: string | null) => SanitizeIssue[]
  // Paso 2b. Valida la hoja elegida contra lo que el módulo sabe reconocer como fuente —
  // `null` = sin problema. Sin esto no se valida nada (Research no tiene hojas). Mientras haya
  // aviso, el botón de Importar queda deshabilitado: un heurístico de nombre de hoja que no
  // reconoce el archivo tiene que frenar al usuario ANTES de calcular un plan vacío en silencio,
  // no dejarlo apretar un botón que no va a hacer nada (ver `pacienteImportPlan.fuenteDeHoja`).
  validateSource?: (hoja: string | null) => SourceWarning | null
  // Paso 5. Resuelve un id de candidato (los que devuelve `buildPlan` en `toMerge`) a lo que
  // hay que mostrar de ese registro ya existente. Sin esto, el paso no se renderiza.
  resolveCandidate?: (id: string) => { label: string; values: Record<string, unknown> } | undefined
  buildPlan: (rows: string[][], mapping: (string | null)[], dupMode: DupMode, valueMap: ValueMap, hoja: string | null) => P
  // Clave del label de "si ya existe" en la sección Duplicados — Research habla de NCT#,
  // Medical de fuente+clave. Default: el texto genérico que ya tenía esta sección.
  dupLabelKey?: I18nKey
  selectFileLabelKey?: I18nKey
  // Sección que un módulo cuelga entre "columnas descartadas" y "duplicados" — Research la usa
  // para el preview de contadores a pisar. Recibe el plan YA resuelto (paso 5 incluido, ver
  // comentario de `resolvedPlan` más abajo) pero ANTES de `transformPlan`.
  renderExtra?: (plan: P) => ReactNode
  // Transforma el plan antes de ejecutarlo (Research saca de acá el contador de los leads
  // desmarcados en `renderExtra`). Sin esto, se ejecuta el plan ya resuelto.
  transformPlan?: (plan: P) => P
  onConfirm: (plan: P) => ConfirmResult
  onClose: () => void
}

export default function ImportModal<P extends ImportPlan = ImportPlan>({
  open, title, accept, kind, fieldDefs, domainOptions, normalizeDomainValue, guessMapping, computeDropped,
  detectAnomalies, validateSource, resolveCandidate, buildPlan, dupLabelKey, selectFileLabelKey,
  renderExtra, transformPlan, onConfirm, onClose,
}: Props<P>) {
  const { mostrarMensaje } = useApp()
  const { t } = useT()
  // Delimited (CSV/TSV): texto crudo + separador, re-parseados en memoria (parseDelimited es
  // síncrono). Workbook (.xlsx): el buffer se relee por hoja con SheetJS, que es async — por
  // eso `wbParsed` es estado propio y no un `useMemo` como el resto de este archivo.
  const [raw, setRaw] = useState<string | null>(null)
  const [sep, setSep] = useState(',')
  const [workbookBuf, setWorkbookBuf] = useState<ArrayBuffer | null>(null)
  const [hojas, setHojas] = useState<string[]>([])
  const [hoja, setHoja] = useState<string | null>(null)
  const [wbParsed, setWbParsed] = useState<ParsedFile>(EMPTY_PARSED)
  const [mapping, setMapping] = useState<(string | null)[]>([])
  const [dupMode, setDupMode] = useState<DupMode>('update')
  const [valueMap, setValueMap] = useState<ValueMap>({}) // override manual de valores de dominio
  // Paso 4: filas excluidas a mano (por índice en `parsed.rows`) y celdas editadas
  // (`rowIndex:colIndex` → valor). Paso 5: candidato elegido por fila de `plan.toMerge`
  // (índice en ese array → id del candidato, o `null` = tratarla como paciente nuevo).
  const [sanitizeExcluded, setSanitizeExcluded] = useState<Set<number>>(new Set())
  const [sanitizeEdits, setSanitizeEdits] = useState<Record<string, string>>({})
  const [mergeOverrides, setMergeOverrides] = useState<Map<number, string | null>>(new Map())

  // Todos los hooks van ANTES de cualquier return condicional (Rules of Hooks): si el
  // early-return quedara en medio, abrir el modal renderiza más hooks que el render previo →
  // "Rendered more hooks than during the previous render".
  const delimitedParsed = useMemo<ParsedFile>(() => (raw ? parseDelimited(raw, sep) : EMPTY_PARSED), [raw, sep])

  useEffect(() => {
    if (kind !== 'workbook' || !workbookBuf || !hoja) { setWbParsed(EMPTY_PARSED); return }
    let cancelled = false
    readSheet(workbookBuf, hoja)
      .then(r => { if (!cancelled) setWbParsed(r) })
      .catch(err => { if (!cancelled) mostrarMensaje('error', err instanceof Error ? err.message : t('import.readError')) })
    return () => { cancelled = true }
  }, [kind, workbookBuf, hoja, mostrarMensaje, t])

  const parsed = kind === 'workbook' ? wbParsed : delimitedParsed

  // Re-adivina el mapeo cada vez que cambian los headers reales (archivo nuevo, separador
  // distinto, otra hoja) — las tres son "otro archivo" desde el punto de vista del mapeo.
  useEffect(() => {
    if (parsed.headers.length) setMapping(guessMapping(parsed.headers))
  }, [parsed.headers, guessMapping])

  const dropped = useMemo(() => computeDropped(parsed.headers, mapping), [parsed.headers, mapping, computeDropped])

  // Paso 2b: `null` mientras no haya problema. Con aviso, el resumen del paso 6 seguiría
  // calculando sobre un plan vacío si no fuera por `canImport` más abajo — acá solo se decide
  // SI hay problema; qué hacer con eso (deshabilitar el botón) es más abajo, junto al resto de
  // `canImport`.
  const sourceWarning = useMemo(() => (validateSource ? validateSource(hoja) : null), [validateSource, hoja])

  // Paso 4: anomalías detectadas sobre las filas CRUDAS (antes de excluir/editar nada — el
  // saneamiento decide qué se corrige, no al revés).
  const sanitizeIssues = useMemo(
    () => (detectAnomalies ? detectAnomalies(parsed.rows, mapping, hoja) : []),
    [detectAnomalies, parsed.rows, mapping, hoja],
  )
  const editsByRow = useMemo(() => {
    const m = new Map<number, Map<number, string>>()
    for (const [key, val] of Object.entries(sanitizeEdits)) {
      // Vacío = "no corregí nada, se usa el crudo tal cual" (ver el comentario de `SanitizeRow`
      // sobre por qué el input arranca vacío) — sin este filtro, borrar el input pisaría la
      // celda cruda con '' en vez de volver al valor original del archivo.
      if (val === '') continue
      const [ri, ci] = key.split(':').map(Number)
      if (!m.has(ri)) m.set(ri, new Map())
      m.get(ri)!.set(ci, val)
    }
    return m
  }, [sanitizeEdits])
  // Lo que de verdad se manda a `buildPlan`: sin las filas excluidas, con las celdas editadas.
  const sanitizedRows = useMemo(() => {
    const out: string[][] = []
    parsed.rows.forEach((fila, i) => {
      if (sanitizeExcluded.has(i)) return
      const rowEdits = editsByRow.get(i)
      out.push(rowEdits ? fila.map((v, ci) => rowEdits.get(ci) ?? v) : fila)
    })
    return out
  }, [parsed.rows, sanitizeExcluded, editsByRow])

  const plan = useMemo(() => buildPlan(sanitizedRows, mapping, dupMode, valueMap, hoja), [sanitizedRows, mapping, dupMode, valueMap, buildPlan, hoja])

  // Paso 5: selección efectiva por fila de `plan.toMerge` — el override explícito si existe,
  // si no el default (exacta → el primer candidato exacto; parcial → ninguno, decisión manual).
  const mergeSelections = useMemo(
    () => plan.toMerge.map((m, idx) => {
      if (mergeOverrides.has(idx)) return mergeOverrides.get(idx) as string | null
      return m.preMarcado ? (m.candidatos.find(c => c.nivel === 'exacta')?.id ?? null) : null
    }),
    [plan.toMerge, mergeOverrides],
  )

  // Re-empaqueta `toMerge` en `toUpdate`/`toInsert` según lo elegido: nada de esto conoce
  // pacientes ni leads, solo mueve la fila entrante al bucket que corresponde. La fusión de
  // VALORES (qué campo gana) es responsabilidad de quien escribe el plan (Medical: `escribirImport`
  // ya la hace con el registro real de la base), no de este modal.
  const { resolvedPlan, fusionadas } = useMemo(() => {
    const fusion: ImportPlan['toUpdate'] = []
    const nuevasDeMerge: ImportPlan['toInsert'] = []
    plan.toMerge.forEach((m, idx) => {
      const sel = mergeSelections[idx]
      if (sel) fusion.push({ id: sel, values: m.values })
      else nuevasDeMerge.push(m.values)
    })
    const resolved = {
      ...plan,
      toInsert: [...plan.toInsert, ...nuevasDeMerge],
      toUpdate: [...plan.toUpdate, ...fusion],
      toMerge: [],
      // El spread de arriba ya cubre cualquier campo extra que P agregue por encima de
      // ImportPlan (Research no agrega ninguno hoy); lo único que cambia son los tres buckets.
    } as P
    return { resolvedPlan: resolved, fusionadas: fusion.length }
  }, [plan, mergeSelections])

  const finalPlan = useMemo(() => (transformPlan ? transformPlan(resolvedPlan) : resolvedPlan), [resolvedPlan, transformPlan])

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
      for (const row of sanitizedRows) {
        const rawv = (row[i] ?? '').trim()
        if (!rawv || seen.has(rawv)) continue
        seen.add(rawv)
        const norm = normalizeDomainValue(col, rawv)
        values.push({ raw: rawv, guess: norm ?? '', resolved: norm !== null })
      }
      if (values.length) groups.push({ column: col, values })
    })
    return groups
  }, [mapping, sanitizedRows, domainOptions, normalizeDomainValue])
  if (!open) return null

  const resetFileState = () => {
    setRaw(null); setSep(','); setWorkbookBuf(null); setHojas([]); setHoja(null); setWbParsed(EMPTY_PARSED)
    setMapping([]); setDupMode('update'); setValueMap({})
    setSanitizeExcluded(new Set()); setSanitizeEdits({}); setMergeOverrides(new Map())
  }
  const close = () => { resetFileState(); onClose() }
  const setValue = (col: string, rawv: string, canonical: string) =>
    setValueMap(m => ({ ...m, [col]: { ...m[col], [rawv]: canonical } }))
  const unresolved = domainGroups.reduce((n, g) => n + g.values.filter(v => !v.resolved && !(valueMap[g.column]?.[v.raw])).length, 0)

  // Paso 5, ya separado en las dos listas que pide el spec: arriba exactas, abajo parciales.
  const conIndice = plan.toMerge.map((m, idx) => ({ m, idx }))
  const exactas = conIndice.filter(x => x.m.preMarcado)
  const parciales = conIndice.filter(x => !x.m.preMarcado)
  const candidatosDe = (m: (typeof conIndice)[number]['m']): MergeCandidateDisplay[] =>
    m.candidatos.map(c => {
      const info = resolveCandidate?.(c.id)
      return { id: c.id, nivel: c.nivel, label: info?.label ?? c.id, values: info?.values ?? {} }
    })
  const seleccionar = (idx: number) => (id: string | null) => setMergeOverrides(prev => new Map(prev).set(idx, id))
  const desmarcarExactas = () => setMergeOverrides(prev => {
    const next = new Map(prev)
    exactas.forEach(x => next.set(x.idx, null))
    return next
  })

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    resetFileState()
    if (kind === 'workbook') {
      const buf = await file.arrayBuffer()
      try {
        const { hojas: leidas } = await parseWorkbook(buf)
        if (!leidas.length) { mostrarMensaje('error', t('import.empty')); return }
        setWorkbookBuf(buf); setHojas(leidas); setHoja(leidas[0])
      } catch (err) {
        mostrarMensaje('error', err instanceof Error ? err.message : t('import.readError'))
      }
      return
    }
    const text = await file.text()
    const lines = text.replace(/\r\n?/g, '\n').split('\n').filter(l => l.trim())
    if (lines.length < 2) { mostrarMensaje('error', t('import.empty')); return }
    setRaw(text); setSep(detectSeparator(lines[0]))
  }

  function changeHoja(h: string) {
    setHoja(h)
    setValueMap({}); setSanitizeExcluded(new Set()); setSanitizeEdits({}); setMergeOverrides(new Map())
  }

  // Cambiar el separador re-parsea (las columnas cambian); el mapeo se re-adivina solo, por
  // el efecto de arriba.
  function changeSep(newSep: string) {
    setSep(newSep)
    setValueMap({}); setSanitizeExcluded(new Set()); setSanitizeEdits({}); setMergeOverrides(new Map())
  }

  const loaded = kind === 'workbook' ? workbookBuf !== null : raw !== null
  // Sin `!sourceWarning`, un heurístico que no reconoce la hoja deja el botón habilitado sobre
  // un plan que `buildPlan` ya calculó vacío — apretarlo no hace nada y no lo dice en ningún
  // lado (ver el comentario de `validateSource`).
  const canImport = parsed.rows.length > 0 && mapping.some(Boolean) && !sourceWarning

  async function doImport() {
    if (!canImport) { mostrarMensaje('error', t('import.noColumns')); return }
    if (await onConfirm(finalPlan)) close()
  }


  return (
    <Modal width={720} onClose={close}>
      {/* Encabezado propio y no el de Modal: acá lleva un segundo botón (Importar) además
          de la X, y Modal solo tiene slot para el título. */}
      <div className={s.head}>
        <div className={s.titulo}>{title}</div>
        <div className={s.headActions}>
          {loaded && <button type="button" onClick={doImport} disabled={!canImport} className={s.importBtn}>{t('import.button')}</button>}
          <button type="button" onClick={close} className={s.cerrar}>✕</button>
        </div>
      </div>

      {!loaded ? (
        <div className={s.dropzone}>
          <div className={s.dropzoneIcon}>📄</div>
          <div className={s.dropzoneHint}>{t(selectFileLabelKey ?? 'import.selectFile')}</div>
          <input type="file" accept={accept} onChange={onFile} className={s.fileInput} />
        </div>
      ) : (
        <>
          {/* ARCHIVO */}
          <div className={s.sectionTitle}>{t('import.fileSection')}</div>
          {kind === 'delimited' && (
            <div className={s.fileRow}>
              <span className={s.fileLabel}>{t('import.separator')}</span>
              <select value={sep} onChange={e => changeSep(e.target.value)} className={`${s.select} ${s.selectNarrow}`}>
                {SEP_OPTIONS.map(o => <option key={o.value} value={o.value}>{t(o.labelKey)}</option>)}
              </select>
              <span className={s.rowsDetected}>{t('import.rowsDetected', { n: parsed.rows.length })}</span>
              <button type="button" onClick={() => resetFileState()} className={s.changeFile}>{t('import.selectFile')}</button>
            </div>
          )}
          {kind === 'workbook' && (
            <div className={s.fileRow}>
              {hojas.length > 1 && <SheetPicker hojas={hojas} value={hoja ?? ''} onChange={changeHoja} />}
              <span className={s.rowsDetected}>{t('import.rowsDetected', { n: parsed.rows.length })}</span>
              <button type="button" onClick={() => resetFileState()} className={s.changeFile}>{t(selectFileLabelKey ?? 'import.selectFile')}</button>
            </div>
          )}
          {/* Paso 2b: junto al selector de hoja si hay más de una, arriba del todo (primer aviso
              tras cargar el archivo) si hay una sola — es el único momento en que el usuario
              puede corregirlo, así que va antes que cualquier otra sección. */}
          {sourceWarning && <div className={s.sourceWarning}>{t(sourceWarning.messageKey, sourceWarning.messageParams)}</div>}
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

          {/* SANEAMIENTO — paso 4, solo si el módulo sabe detectar anomalías */}
          {sanitizeIssues.length > 0 && (
            <>
              <div className={s.sectionTitle}>{t('import.sanitizeSection')}</div>
              <div className={s.warnText}>{t('import.sanitizeNote', { n: sanitizeIssues.length })}</div>
              {/* El input de cada fila editable arranca en el CRUDO, no en lo interpretado: lo
                  que se edita es la celda que después se vuelve a normalizar (fecha, teléfono,
                  nombre), no un valor ya resuelto que un normalizador reinterpretaría como si
                  fuera otro dato crudo (una fecha ISO no es un serial). */}
              {sanitizeIssues.map((issue, i) => {
                const key = `${issue.rowIndex}:${issue.colIndex}`
                return (
                  <SanitizeRow key={i} rowIndex={issue.rowIndex} messageKey={issue.messageKey} messageParams={issue.messageParams}
                    crudo={issue.crudo} interpretado={issue.interpretado} editable={issue.colIndex !== null}
                    value={sanitizeEdits[key] ?? ''}
                    excluded={sanitizeExcluded.has(issue.rowIndex)}
                    onEdit={v => setSanitizeEdits(m => ({ ...m, [key]: v }))}
                    onToggleExclude={() => setSanitizeExcluded(prev => {
                      const next = new Set(prev)
                      next.has(issue.rowIndex) ? next.delete(issue.rowIndex) : next.add(issue.rowIndex)
                      return next
                    })} />
                )
              })}
            </>
          )}

          {renderExtra?.(resolvedPlan)}

          {/* DUPLICADOS POR SIMILITUD — paso 5, solo si el módulo sabe mostrar un candidato.
              Arriba las exactas (pre-marcadas, con "desmarcar todas"), abajo las parciales
              (sin marcar) — las dos listas que pide el spec, con las filas enfrentadas dentro
              de cada `MergeCandidateRow`. */}
          {resolveCandidate && plan.toMerge.length > 0 && (
            <>
              <div className={s.sectionTitle}>{t('import.mergeSection')}</div>
              {exactas.length > 0 && (
                <div className={s.mergeGroupHead}>
                  <span className={s.mergeGroupLabel}>{t('import.merge.exactSection', { n: exactas.length })}</span>
                  <button type="button" className={s.unmarkAll} onClick={desmarcarExactas}>{t('import.merge.unmarkAll')}</button>
                </div>
              )}
              {exactas.map(({ m, idx }) => (
                <MergeCandidateRow key={idx} fields={fieldDefs} entrante={m.values} candidatos={candidatosDe(m)}
                  selectedId={mergeSelections[idx]} onSelect={seleccionar(idx)} />
              ))}
              {parciales.length > 0 && (
                <div className={s.mergeGroupHead}>
                  <span className={s.mergeGroupLabel}>{t('import.merge.partialSection', { n: parciales.length })}</span>
                </div>
              )}
              {parciales.map(({ m, idx }) => (
                <MergeCandidateRow key={idx} fields={fieldDefs} entrante={m.values} candidatos={candidatosDe(m)}
                  selectedId={mergeSelections[idx]} onSelect={seleccionar(idx)} />
              ))}
            </>
          )}

          {/* DUPLICADOS (por identidad exacta) */}
          <div className={s.sectionTitle}>{t('import.dupSection')}</div>
          <div className={s.fileRow}>
            <span className={s.fileLabel}>{t(dupLabelKey ?? 'import.dupLabel')}</span>
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

          {/* RESUMEN — paso 6, por categoría. Nada se descarta sin aparecer en una línea:
              las cuatro nuevas (fusionadas/repetidas/excluidas/de eliminados) solo se muestran
              si tienen algo que contar, así que para Research (que nunca las genera) esta
              sección se ve exactamente igual que antes de la Tarea 10b. */}
          <div className={s.summary}>
            {t('import.summary', { ins: finalPlan.toInsert.length, upd: finalPlan.toUpdate.length, skip: finalPlan.skipped })}
          </div>
          {(fusionadas > 0 || plan.repetidas > 0 || sanitizeExcluded.size > 0 || plan.tumbas > 0) && (
            <div className={s.summaryExtra}>
              {fusionadas > 0 && <span className={s.summaryChip}>{t('import.summary.merged', { n: fusionadas })}</span>}
              {plan.repetidas > 0 && <span className={s.summaryChip}>{t('import.summary.duplicatedInFile', { n: plan.repetidas })}</span>}
              {sanitizeExcluded.size > 0 && <span className={s.summaryChip}>{t('import.summary.excluded', { n: sanitizeExcluded.size })}</span>}
              {plan.tumbas > 0 && <span className={s.summaryChip}>{t('import.summary.deleted', { n: plan.tumbas })}</span>}
            </div>
          )}
          {/* silencia el lint de variable no usada sin inventarle un uso visual falso */}
        </>
      )}
    </Modal>
  )
}
