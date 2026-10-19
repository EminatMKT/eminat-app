'use client'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/shared/db/supabase'
import { ownerLabel, teamLabel, type SalesDirectory } from './salesDirectory'
import s from './SalesModule.module.css'

type Destination = 'LEAD' | 'CONTACT'
type Job = { id: string; status: string; totalRows: number; processedRows: number; createdRows: number;
  updatedRows: number; skippedRows: number; failedRows: number; duplicateRows: number; invalidRows: number;
  sheetNames: { name: string; headers: string[] }[] }
type Sample = { rowNumber: number; sourceData: string[] }
type PreviewRow = { rowNumber: number; status: string; errors?: unknown }
type Result = { data?: Job; sampleRows?: Sample[]; rows?: PreviewRow[];
  counts?: { ready: number; duplicates: number; invalid: number }; code?: string }
const commonFields = ['displayName', 'firstName', 'lastName', 'email', 'phone', 'title',
  'address.street', 'address.city', 'address.state', 'address.postalCode', 'address.country',
  'dateOfBirth', 'insurance', 'corazonSalud', 'plan', 'product', 'nextAction',
  'nextFollowUpAt', 'description', 'doNotEmail', 'doNotCall']
const leadFields = [...commonFields, 'companyName', 'website', 'industry', 'source', 'status']
const finished = new Set(['COMPLETED', 'COMPLETED_WITH_ERRORS', 'FAILED', 'CANCELLED'])

async function importRequest(path: string, method = 'GET', body?: FormData | object, key?: string): Promise<Result> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Session required')
  const response = await fetch(`/api/integrations/annie/sales/imports${path}`, {
    method, cache: 'no-store', headers: { Authorization: `Bearer ${session.access_token}`,
      ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...(key ? { 'Idempotency-Key': key } : {}) },
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  })
  let result: Result
  try { result = await response.json() as Result } catch { throw new Error('ANNIE_INVALID_RESPONSE') }
  if (!response.ok) throw new Error(result.code ?? 'IMPORT_FAILED')
  return result
}

export default function SalesImporter({ destination, directory, onClose, onComplete }: {
  destination: Destination; directory: SalesDirectory; onClose: () => void; onComplete: () => void
}) {
  const uploadKey = useRef('')
  const [file, setFile] = useState<File | null>(null)
  const [job, setJob] = useState<Job | null>(null)
  const [sheet, setSheet] = useState('')
  const [columns, setColumns] = useState<Record<number, string>>({})
  const [samples, setSamples] = useState<Sample[]>([])
  const [rows, setRows] = useState<PreviewRow[]>([])
  const [counts, setCounts] = useState<Result['counts']>(undefined)
  const [duplicateMode, setDuplicateMode] = useState('SKIP')
  const [owner, setOwner] = useState('')
  const [team, setTeam] = useState('')
  const [source, setSource] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const fields = destination === 'LEAD' ? leadFields : commonFields

  useEffect(() => {
    if (!job || job.status !== 'PROCESSING') return
    let active = true
    const poll = async () => {
      try {
        const result = await importRequest(`/${job.id}`)
        if (active && result.data) {
          setJob(result.data)
          if (finished.has(result.data.status)) onComplete()
        }
      } catch (cause) { if (active) setError(cause instanceof Error ? cause.message : 'IMPORT_STATUS_FAILED') }
    }
    const timer = window.setInterval(() => void poll(), 2000)
    void poll()
    return () => { active = false; window.clearInterval(timer) }
  }, [job?.id, job?.status, onComplete]) // eslint-disable-line react-hooks/exhaustive-deps

  async function upload(event: React.FormEvent) {
    event.preventDefault()
    if (!file) return
    setBusy(true); setError('')
    try {
      const form = new FormData(); form.set('file', file); form.set('destination', destination)
      const result = await importRequest('', 'POST', form, uploadKey.current || (uploadKey.current = crypto.randomUUID()))
      if (!result.data) throw new Error('ANNIE_INVALID_RESPONSE')
      setJob(result.data)
      const first = result.data.sheetNames[0]
      setSheet(first?.name ?? '')
      setColumns(Object.fromEntries((first?.headers ?? []).map((name, index) => {
        const normalized = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')
        return [index, fields.find(field => field.toLowerCase().replace(/[^a-z0-9]/g, '') === normalized) ?? '']
      })))
      const detail = await importRequest(`/${result.data.id}?sheet=${encodeURIComponent(first?.name ?? '')}`)
      setSamples(detail.sampleRows ?? [])
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'IMPORT_UPLOAD_FAILED') }
    finally { setBusy(false) }
  }
  async function preview() {
    if (!job) return
    setBusy(true); setError('')
    try {
      const result = await importRequest(`/${job.id}/preview`, 'POST', {
        sheetName: sheet, mapping: Object.entries(columns).filter(([, field]) => field)
          .map(([column, field]) => ({ column: Number(column), field })),
        duplicateMode, ...(owner ? { ownerProfileId: owner } : {}),
        ...(team ? { teamId: team } : {}), ...(source ? { defaultSource: source } : {}),
      })
      if (!result.data) throw new Error('ANNIE_INVALID_RESPONSE')
      setJob(result.data); setCounts(result.counts)
      setRows((await importRequest(`/${job.id}`)).rows ?? [])
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'IMPORT_PREVIEW_FAILED') }
    finally { setBusy(false) }
  }
  async function command(action: 'start' | 'cancel') {
    if (!job) return
    setBusy(true); setError('')
    try {
      const result = await importRequest(`/${job.id}/${action}`, 'POST', {})
      if (!result.data) throw new Error('ANNIE_INVALID_RESPONSE')
      setJob(result.data)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'IMPORT_COMMAND_FAILED') }
    finally { setBusy(false) }
  }

  const currentSheet = job?.sheetNames.find(item => item.name === sheet)
  return <section className={s.detail} aria-label="ANNIE import">
    <div className={s.cardHeader}><h2>Import {destination === 'LEAD' ? 'Leads' : 'Contacts'} through ANNIE</h2><button type="button" onClick={onClose}>Close</button></div>
    <p className={s.muted}>ANNIE validates rows, duplicates, ownership and organization scope before saving.</p>
    {error && <p role="alert" className={s.error}>{error}</p>}
    {!job && <form className={s.filters} onSubmit={event => void upload(event)}><label>CSV or Excel file
      <input type="file" accept=".csv,.xlsx" required onChange={event => { setFile(event.target.files?.[0] ?? null); uploadKey.current = crypto.randomUUID() }} /></label>
      <button className={s.next} type="submit" disabled={!file || busy}>Upload for preview</button>
      <small>Maximum 10 MB and 5,000 rows. Use controlled synthetic records for QA.</small></form>}
    {job && <><p role="status">{job.status} · {job.processedRows}/{job.totalRows} processed</p>
      {job.status === 'MAPPING' && currentSheet && <>
        <div className={s.filters}><label>Sheet <select value={sheet} onChange={event => {
          const name = event.target.value; setSheet(name); setColumns({})
          void importRequest(`/${job.id}?sheet=${encodeURIComponent(name)}`)
            .then(result => setSamples(result.sampleRows ?? []))
            .catch(cause => setError(cause instanceof Error ? cause.message : 'SHEET_UNAVAILABLE'))
        }}>{job.sheetNames.map(item => <option key={item.name} value={item.name}>{item.name}</option>)}</select></label>
          <label>Duplicates <select value={duplicateMode} onChange={event => setDuplicateMode(event.target.value)}>
            <option value="SKIP">Skip</option><option value="UPDATE">Update matching records</option><option value="CREATE">Create duplicates</option>
          </select></label>
          <label>Owner <select value={owner} onChange={event => setOwner(event.target.value)}><option value="">Me</option>
            {directory.users?.map(user => <option key={user.principalId} value={user.principalId}>{ownerLabel(directory, user.principalId)}</option>)}
          </select></label><label>Team <select value={team} onChange={event => setTeam(event.target.value)}><option value="">ANNIE default</option>
            {directory.teams?.map(id => <option key={id} value={id}>{teamLabel(directory, id)}</option>)}</select></label>
          {destination === 'LEAD' && <label>Default source <input value={source} onChange={event => setSource(event.target.value)} /></label>}
        </div>
        <div style={{ overflowX: 'auto' }}><table><thead><tr><th>File column</th><th>ANNIE field</th><th>Sample</th></tr></thead><tbody>
          {currentSheet.headers.map((header, index) => <tr key={index}><th>{header || `Column ${index + 1}`}</th><td>
            <select value={columns[index] ?? ''} onChange={event => setColumns(previous => {
              const next = { ...previous }; for (const key of Object.keys(next)) if (next[Number(key)] === event.target.value) next[Number(key)] = ''
              next[index] = event.target.value; return next
            })}><option value="">Do not import</option>{fields.map(field => <option key={field} value={field}>{field}</option>)}</select>
          </td><td>{samples.map(sample => <div key={sample.rowNumber}>{String(sample.sourceData[index] ?? '').slice(0, 70)}</div>)}</td></tr>)}
        </tbody></table></div>
        <button className={s.next} type="button" disabled={busy} onClick={() => void preview()}>Validate and preview</button>
      </>}
      {job.status === 'READY' && <><p>Ready: {counts?.ready ?? 0} · Duplicates: {job.duplicateRows} · Invalid: {job.invalidRows}</p>
        <ul>{rows.slice(0, 20).map(row => <li key={row.rowNumber}>Row {row.rowNumber}: {row.status}</li>)}</ul>
        <p>No records are saved until you confirm.</p>
        <button className={s.next} type="button" disabled={busy || !counts?.ready} onClick={() => void command('start')}>Confirm import in ANNIE</button>
      </>}
      {job.status === 'PROCESSING' && <><progress max={job.totalRows || 1} value={job.processedRows} />
        <button className={s.next} type="button" disabled={busy} onClick={() => void command('cancel')}>Cancel</button></>}
      {finished.has(job.status) && <p>Created: {job.createdRows} · Updated: {job.updatedRows} · Skipped: {job.skippedRows} · Failed: {job.failedRows}</p>}
    </>}
  </section>
}
