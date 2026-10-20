'use client'
import { useState, type FormEvent } from 'react'
import { supabase } from '@/shared/db/supabase'
import { importFields, type ColumnMapping, type ImportResource } from '@/server/sales-native/import-mapping'
import { useT } from '@/shared/i18n'
import s from './NativeSalesModule.module.css'

type Preview = { sheetName: string; headers: string[]; mapping: ColumnMapping[];
  sheets: { name: string; rows: number; headers: string[] }[];
  counts: { ready: number; duplicate: number; invalid: number };
  rows: { rowNumber: number; status: string; code?: string; displayName?: string }[] }
type Batch = { totalReady: number; nextStart: number | null;
  results: { rowNumber: number; status: string; replayed: boolean }[] }

export default function NativeSalesImport({ resource, organizationId, onComplete }: {
  resource: ImportResource; organizationId: string; onComplete: () => void
}) {
  const { t } = useT()
  const [file, setFile] = useState<File | null>(null)
  const [sheetName, setSheetName] = useState('')
  const [mapping, setMapping] = useState<ColumnMapping[] | null>(null)
  const [defaultSource, setDefaultSource] = useState('')
  const [preview, setPreview] = useState<Preview | null>(null)
  const [mappingDirty, setMappingDirty] = useState(false)
  const [offset, setOffset] = useState(0)
  const [created, setCreated] = useState(0)
  const [skipped, setSkipped] = useState(0)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function send(path: string, start?: number): Promise<Record<string, unknown>> {
    if (!file) throw new Error('CHOOSE_FILE')
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('AUTHENTICATION_REQUIRED')
    const body = new FormData()
    body.set('file', file)
    body.set('resource', resource)
    if (sheetName) body.set('sheetName', sheetName)
    if (mapping) body.set('mapping', JSON.stringify(mapping))
    if (defaultSource.trim()) body.set('defaultSource', defaultSource.trim())
    if (start !== undefined) body.set('start', String(start))
    const response = await fetch(`/api/sales-native/imports/${path}`, {
      method: 'POST', body, cache: 'no-store', headers: {
        Authorization: `Bearer ${session.access_token}`, 'X-Sales-Organization-Id': organizationId,
      },
    })
    const result = await response.json().catch(() => null) as Record<string, unknown> | null
    if (!response.ok || !result || typeof result.data !== 'object' || !result.data)
      throw new Error(typeof result?.code === 'string' ? result.code : 'IMPORT_UNAVAILABLE')
    return result.data as Record<string, unknown>
  }

  async function showPreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); setDone(false)
    try {
      const data = await send('preview') as Preview
      setPreview(data); setSheetName(data.sheetName); setMapping(data.mapping); setMappingDirty(false); setOffset(0)
      setCreated(0); setSkipped(0)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'IMPORT_UNAVAILABLE') }
    finally { setBusy(false) }
  }

  async function commit() {
    if (!preview || !mapping || !file || busy || mappingDirty) return
    setBusy(true); setError('')
    let next: number | null = offset
    try {
      while (next !== null) {
        const batch = await send('commit', next) as Batch
        setCreated(value => value + batch.results.filter(row =>
          row.status === 'CREATED' && !row.replayed).length)
        setSkipped(value => value + batch.results.filter(row =>
          row.status === 'SKIPPED' && !row.replayed).length)
        next = batch.nextStart
        setOffset(next ?? batch.totalReady)
      }
      setDone(true); onComplete()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'IMPORT_UNAVAILABLE') }
    finally { setBusy(false) }
  }

  return <section className={`${s.panel} ${s.form}`} aria-label={`Import ${resource}`}>
    <h2>Import {resource === 'leads' ? 'Leads' : 'Contacts'}</h2>
    <p className={s.hint}>{t('salesNative.csvOrXlsxUpTo4MbAnd')}</p>
    <form className={s.form} onSubmit={event => void showPreview(event)}>
      <label>File <input required type="file" accept=".csv,.xlsx" onChange={event => {
        const selected = event.target.files?.[0] ?? null
        setFile(selected && selected.size <= 4 * 1024 * 1024 ? selected : null)
        setError(selected && selected.size > 4 * 1024 * 1024 ? 'FILE_SIZE_INVALID' : '')
        if (selected && selected.size > 4 * 1024 * 1024) event.target.value = ''
        setSheetName(''); setMapping(null); setPreview(null); setDone(false)
      }} /></label>
      {resource === 'leads' && <label>Default source <input maxLength={500} value={defaultSource}
        onChange={event => { setDefaultSource(event.target.value); setMappingDirty(true) }} placeholder={t('salesNative.usedWhenTheFileHasNoSource')} /></label>}
      {preview && <>
        {preview.sheets.length > 1 && <label>Sheet <select value={sheetName} onChange={event => {
          setSheetName(event.target.value); setMapping(null); setMappingDirty(true)
        }}>{preview.sheets.map(sheet => <option key={sheet.name} value={sheet.name}>{sheet.name} ({sheet.rows} rows)</option>)}</select></label>}
        <div className={s.formGrid}>{preview.headers.map((header, column) => <label key={column}>
          {header || `Column ${column + 1}`}
          <select value={mapping?.find(item => item.column === column)?.field ?? ''}
            onChange={event => {
              const field = event.target.value
              setMapping(previous => [ ...(previous ?? []).filter(item => item.column !== column && item.field !== field),
                ...(field ? [{ column, field }] : []) ])
              setMappingDirty(true)
            }}>
            <option value="">{t('salesNative.ignore')}</option>
            {importFields(resource).map(field => <option key={field} value={field}>{field}</option>)}
          </select>
        </label>)}</div>
      </>}
      <button type="submit" disabled={busy || !file}>{busy ? 'Working…' : 'Preview file'}</button>
    </form>
    {preview && <>
      <p role="status">Ready: {preview.counts.ready} · Duplicates in file: {preview.counts.duplicate} · Invalid: {preview.counts.invalid}</p>
      <ul className={s.breakdown}>{preview.rows.slice(0, 20).map(row => <li key={row.rowNumber}>
        <span>Row {row.rowNumber}: {row.displayName || row.code || row.status}</span><strong>{row.status}</strong>
      </li>)}</ul>
      {preview.rows.length > 20 && <p className={s.hint}>{t('salesNative.showingTheFirst20RowResults')}</p>}
      <button type="button" disabled={busy || done || mappingDirty || preview.counts.ready === 0}
        onClick={() => void commit()}>{busy ? 'Importing…' : done ? 'Import complete' :
          offset ? `Resume import (${offset}/${preview.counts.ready})` : `Import ${preview.counts.ready} ready records`}</button>
      {mappingDirty && <p className={s.hint}>{t('salesNative.previewAgainToConfirmTheChangedMappingOr')}</p>}
    </>}
    {(created > 0 || skipped > 0) && <p role="status">Created: {created} · Skipped existing: {skipped}</p>}
    {error && <p role="alert" className={s.error}>{error}</p>}
  </section>
}
