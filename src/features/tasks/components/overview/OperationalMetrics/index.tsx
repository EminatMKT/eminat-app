'use client'
import { useEffect, useRef, useState } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import Panel from '@/shared/components/dashboard/Panel'

type Group = { id: string | null; name: string; total: number; completed: number; pending: number; overdue: number }
type Data = { overview: { overdue: number }; users: Group[]; teams: Group[]; departments: Group[]; companies: Group[]; trend: { day: string; total: number }[] }
const empty: Data = { overview: { overdue: 0 }, users: [], teams: [], departments: [], companies: [], trend: [] }
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' })
const daysAgo = (days: number) => { const d = new Date(); d.setDate(d.getDate() - days); return d.toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' }) }

// All numbers come from the admin-guarded SQL aggregate. No task rows cross this API.
export default function OperationalMetrics() {
  const { esAdmin, s1, border, t1, t3, accent } = useApp()
  const { t } = useT()
  const [data, setData] = useState<Data>(empty)
  const [options, setOptions] = useState<Data>(empty)
  const optionsLoaded = useRef(false)
  const [from, setFrom] = useState(() => daysAgo(29))
  const [to, setTo] = useState(today)
  const [empresa, setEmpresa] = useState('')
  const [user, setUser] = useState('')
  const [team, setTeam] = useState('')
  const [department, setDepartment] = useState('')
  const [estado, setEstado] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    if (!esAdmin) return
    const controller = new AbortController()
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries({ from, to, empresa, user, team, department, estado })) if (value) params.set(key, value)
    fetch(`/api/tasks/dashboard?${params}`, { signal: controller.signal })
      .then(async r => { if (!r.ok) throw new Error((await r.json()).error || 'Error'); return r.json() })
      .then((result: Data) => { setData(result); if (!optionsLoaded.current) { setOptions(result); optionsLoaded.current = true } setError('') })
      .catch(err => { if (err.name !== 'AbortError') setError(err.message) })
    return () => controller.abort()
  }, [esAdmin, from, to, empresa, user, team, department, estado])
  if (!esAdmin) return null
  const field = { fontSize: 11, color: t3, display: 'grid', gap: 4 } as const
  const select = { padding: '6px 8px', background: s1, color: t1, border: `1px solid ${border}`, borderRadius: 7 }
  const groups: { title: string; rows: Group[] }[] = [
    { title: t('metrics.users'), rows: data.users }, { title: t('metrics.teams'), rows: data.teams },
    { title: t('metrics.companies'), rows: data.companies },
  ]
  return <Panel collapsible persistKey="tasks-operational-metrics" title={t('metrics.subtitle')}>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
      <label style={field}>{t('metrics.from')}<input aria-label={t('metrics.from')} type="date" value={from} onChange={e => setFrom(e.target.value)} style={select} /></label>
      <label style={field}>{t('metrics.to')}<input aria-label={t('metrics.to')} type="date" value={to} onChange={e => setTo(e.target.value)} style={select} /></label>
      <label style={field}>{t('metrics.company')}<select aria-label={t('metrics.company')} value={empresa} onChange={e => setEmpresa(e.target.value)} style={select}><option value="">{t('metrics.allCompanies')}</option>{options.companies.filter(x => x.id).map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
      <label style={field}>{t('metrics.user')}<select aria-label={t('metrics.user')} value={user} onChange={e => setUser(e.target.value)} style={select}><option value="">{t('metrics.all')}</option>{options.users.filter(x => x.id).map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
      <label style={field}>{t('metrics.team')}<select aria-label={t('metrics.team')} value={team} onChange={e => setTeam(e.target.value)} style={select}><option value="">{t('metrics.all')}</option>{options.teams.filter(x => x.id).map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
      <label style={field}>{t('metrics.department')}<select aria-label={t('metrics.department')} value={department} onChange={e => setDepartment(e.target.value)} style={select}><option value="">{t('metrics.all')}</option>{options.departments.filter(x => x.id).map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
      <label style={field}>{t('metrics.status')}<select aria-label={t('metrics.status')} value={estado} onChange={e => setEstado(e.target.value)} style={select}><option value="">{t('metrics.all')}</option>{['Pendiente','En proceso','Por aprobar','Completado','Rechazado','Cancelado'].map(x => <option key={x}>{x}</option>)}</select></label>
    </div>
    {error && <p role="alert" style={{ color: '#e05a62' }}>{error}</p>}
    <div style={{ display: 'flex', gap: 18, alignItems: 'baseline', marginBottom: 18 }}><span style={{ color: t3 }}>{t('metrics.overdue')}</span><strong style={{ color: '#e05a62', fontSize: 26 }}>{data.overview.overdue}</strong></div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 16 }}>
      {groups.map(group => <div key={group.title} style={{ border: `1px solid ${border}`, borderRadius: 10, padding: 12 }}><strong>{group.title}</strong>{group.rows.slice(0, 6).map(row => <div key={row.id || row.name} style={{ marginTop: 10, fontSize: 12 }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{row.name}</span><span>{row.pending} {t('metrics.pendingLower')} · {row.overdue} {t('metrics.overdueLower')}</span></div><div style={{ height: 5, borderRadius: 5, background: border, marginTop: 4 }}><div style={{ height: 5, borderRadius: 5, background: accent, width: `${row.total ? 100 * row.completed / row.total : 0}%` }} /></div></div>)}{!group.rows.length && <p style={{ color: t3 }}>{t('metrics.noData')}</p>}</div>)}
    </div>
    <div style={{ marginTop: 18 }}><strong>{t('metrics.daily')}</strong><div style={{ height: 90, display: 'flex', alignItems: 'end', gap: 3, overflowX: 'auto' }}>{data.trend.map(point => <div key={point.day} title={`${point.day}: ${point.total}`} style={{ background: accent, minWidth: 10, height: `${Math.max(5, 100 * point.total / Math.max(...data.trend.map(x => x.total), 1))}%`, borderRadius: 3 }} />)}{!data.trend.length && <p style={{ color: t3 }}>{t('metrics.noData')}</p>}</div></div>
  </Panel>
}
