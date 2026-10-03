'use client'
import { useEffect, useRef, useState } from 'react'
import AppShell from '@/shared/components/shell/AppShell'
import AccessDenied from '@/shared/components/access/AccessDenied'
import { useApp } from '@/shared/context/AppContext'
import { TabBar, TabButton } from '@/shared/components/ui'
import { useT } from '@/shared/i18n'

type Summary = { total: number; completed: number; pending: number; overdue: number; completionRate?: number }
type Row = Summary & { id: string | null; name: string }
type Metrics = { overview: Summary; users: Row[]; teams: Row[]; departments: Row[]; companies: Row[]; trend: { day: string; total: number; completed: number }[] }
type View = 'overview' | 'users' | 'teams' | 'companies'
const initial: Metrics = { overview: { total: 0, completed: 0, pending: 0, overdue: 0, completionRate: 0 }, users: [], teams: [], departments: [], companies: [], trend: [] }
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' })
const daysAgo = (days: number) => { const d = new Date(); d.setDate(d.getDate() - days); return d.toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' }) }
const views: { key: View; label: string }[] = [
  { key: 'overview', label: 'Overview' }, { key: 'users', label: 'Users' },
  { key: 'teams', label: 'Teams' }, { key: 'companies', label: 'Companies' },
]

export default function MetricsModule() {
  const { esAdmin, s1, border, t1, t3, accent } = useApp()
  const { t } = useT()
  const [view, setView] = useState<View>('overview')
  const [metrics, setMetrics] = useState<Metrics>(initial)
  const [filterOptions, setFilterOptions] = useState<Metrics>(initial)
  const optionsLoaded = useRef(false)
  const [from, setFrom] = useState(() => daysAgo(29))
  const [to, setTo] = useState(today)
  const [empresa, setEmpresa] = useState('')
  const [user, setUser] = useState('')
  const [team, setTeam] = useState('')
  const [department, setDepartment] = useState('')
  const [estado, setEstado] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    if (!esAdmin) return
    const controller = new AbortController()
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries({ from, to, empresa, user, team, department, estado })) if (value) params.set(key, value)
    setLoading(true)
    fetch(`/api/metrics?${params}`, { signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error((await response.json()).error || 'Error'); return response.json() })
      .then(data => { setMetrics(data); if (!optionsLoaded.current) { setFilterOptions(data); optionsLoaded.current = true } setError('') })
      .catch(err => { if (err.name !== 'AbortError') setError(err.message) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [esAdmin, from, to, empresa, user, team, department, estado])
  if (!esAdmin) return <AccessDenied />
  const card = { background: s1, border: `1px solid ${border}`, borderRadius: 12, padding: 18 }
  const label = { color: t3, fontSize: 12, fontWeight: 600 } as const
  const selectedRows = view === 'users' ? metrics.users : view === 'teams' ? metrics.teams : metrics.companies
  return <AppShell title={t('metrics.center')}>
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24, color: t1 }}>
      <h1 style={{ fontSize: 28, margin: '0 0 6px' }}>{t('metrics.title')}</h1>
      <p style={{ color: t3, marginTop: 0 }}>{t('metrics.subtitle')}</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>{[[t('metrics.days7'), 6], [t('metrics.days30'), 29], [t('metrics.month'), -1]] .map(([name, days]) => <button key={name} onClick={() => { setFrom(days === -1 ? `${today().slice(0,7)}-01` : daysAgo(Number(days))); setTo(today()) }} style={{ ...card, padding: '8px 12px', color: t1, cursor: 'pointer' }}>{name}</button>)}</div>
      <div style={{ ...card, display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
        <label style={label}>{t('metrics.from')}<br/><input aria-label={t('metrics.from')} type="date" value={from} onChange={e => setFrom(e.target.value)} /></label>
        <label style={label}>{t('metrics.to')}<br/><input aria-label={t('metrics.to')} type="date" value={to} onChange={e => setTo(e.target.value)} /></label>
        <label style={label}>{t('metrics.company')}<br/><select aria-label={t('metrics.company')} value={empresa} onChange={e => setEmpresa(e.target.value)}><option value="">{t('metrics.allCompanies')}</option>{filterOptions.companies.filter(x => x.id).map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
        <label style={label}>{t('metrics.user')}<br/><select aria-label={t('metrics.user')} value={user} onChange={e => setUser(e.target.value)}><option value="">{t('metrics.all')}</option>{filterOptions.users.filter(x => x.id).map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
        <label style={label}>{t('metrics.team')}<br/><select aria-label={t('metrics.team')} value={team} onChange={e => setTeam(e.target.value)}><option value="">{t('metrics.all')}</option>{filterOptions.teams.filter(x => x.id).map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
        <label style={label}>{t('metrics.department')}<br/><select aria-label={t('metrics.department')} value={department} onChange={e => setDepartment(e.target.value)}><option value="">{t('metrics.all')}</option>{filterOptions.departments.filter(x => x.id).map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
        <label style={label}>{t('metrics.status')}<br/><select aria-label={t('metrics.status')} value={estado} onChange={e => setEstado(e.target.value)}><option value="">{t('metrics.all')}</option>{['Pendiente','En proceso','Por aprobar','Completado','Rechazado','Cancelado'].map(x => <option key={x}>{x}</option>)}</select></label>
      </div>
      {error && <p role="alert" style={{ color: '#e05a62' }}>{error}</p>}
      {loading && <p style={{ color: t3 }}>{t('metrics.loading')}</p>}
      <TabBar>{views.map(x => <TabButton key={x.key} label={t(`metrics.${x.key}`)} active={view === x.key} onClick={() => setView(x.key)} />)}</TabBar>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 12, margin: '18px 0' }}>
        {([[t('metrics.total'),metrics.overview.total],[t('metrics.completed'),metrics.overview.completed],[t('metrics.pending'),metrics.overview.pending],[t('metrics.overdue'),metrics.overview.overdue],[t('metrics.completionRate'),`${metrics.overview.completionRate ?? 0}%`]] as const).map(([name,value]) =>
          <div key={name} style={card}><div style={label}>{name}</div><div style={{ fontSize: 28, fontWeight: 700, color: name === t('metrics.overdue') ? '#e05a62' : accent }}>{value}</div></div>) }
      </div>
      {view === 'overview' ? <div style={card}><h2 style={{ marginTop: 0, fontSize: 17 }}>{t('metrics.teamLoad')}</h2>{metrics.teams.length ? metrics.teams.slice(0, 8).map(row =>
        <div key={row.id || row.name} style={{ marginBottom: 14 }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{row.name}</span><span>{row.pending} {t('metrics.pendingLower')} · {row.overdue} {t('metrics.overdueLower')}</span></div><div style={{ height: 8, borderRadius: 8, background: border, marginTop: 6 }}><div style={{ width: `${metrics.overview.pending ? Math.round(100 * row.pending / metrics.overview.pending) : 0}%`, height: 8, borderRadius: 8, background: accent }} /></div></div>) : <p style={{ color: t3 }}>{t('metrics.noData')}</p>}</div>
      : <div style={card}><h2 style={{ marginTop: 0, fontSize: 17 }}>{t(`metrics.${view}`)}</h2><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}><thead><tr>{[t('metrics.name'),t('metrics.total'),t('metrics.completed'),t('metrics.pending'),t('metrics.overdue'),t('metrics.compliance')].map(x => <th key={x} style={{ padding: 10, borderBottom: `1px solid ${border}` }}>{x}</th>)}</tr></thead><tbody>{selectedRows.map(row => <tr key={row.id || row.name}><td style={{ padding: 10 }}>{row.name}</td><td>{row.total}</td><td>{row.completed}</td><td>{row.pending}</td><td>{row.overdue}</td><td>{row.total ? Math.round(100 * row.completed / row.total) : 0}%</td></tr>)}</tbody></table>{!selectedRows.length && <p style={{ color: t3 }}>{t('metrics.noData')}</p>}</div></div>}
      {view === 'overview' && <div style={{ ...card, marginTop: 16 }}><h2 style={{ marginTop: 0, fontSize: 17 }}>{t('metrics.daily')}</h2><div style={{ display: 'flex', alignItems: 'end', gap: 4, height: 100, overflowX: 'auto' }}>{metrics.trend.length ? metrics.trend.map(point => <div key={point.day} title={`${point.day}: ${point.total} creadas, ${point.completed} completadas`} style={{ minWidth: 14, height: `${Math.max(6, 100 * point.total / Math.max(...metrics.trend.map(x => x.total), 1))}%`, background: accent, borderRadius: 3 }} />) : <p style={{ color: t3 }}>{t('metrics.noData')}</p>}</div></div>}
      <p style={{ color: t3, fontSize: 12, marginTop: 16 }}>{t('metrics.periodNote')}</p>
    </div>
  </AppShell>
}
