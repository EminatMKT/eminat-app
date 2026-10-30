'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import { localMonth } from '@/shared/utils'
import { periodoLargo } from '@/features/tasks/utils/periodo'
import { reportHtml } from '@/features/tasks/utils/report-html'
import { PRODUCTION_REPORT_DISCLAIMER, PRODUCTION_REPORT_SLOGAN } from '@/features/tasks/utils/report-html/disclaimer'
import { STRATIX_LOGO_DATA } from '@/features/tasks/utils/report-html/logo'
import type { ReportData } from '@/server/tasks/reports/read'
import Button from '@/shared/components/ui/Button'
import ReportTableRow from '../ReportTableRow'
import s from '../ReporteTab/index.module.css'

export default function WorkerReport() {
  const { t, intlLocale } = useT()
  const { usuario } = useApp()
  const [month, setMonth] = useState(localMonth)
  const [member, setMember] = useState('')
  const [result, setResult] = useState<{ owner: string; key: string; data: ReportData } | null>(null)
  const [options, setOptions] = useState<{ owner: string; members: ReportData['members']; select: boolean } | null>(null)
  const [error, setError] = useState('')
  const key = `${month}:${member}`
  const validMonth = /^[1-9][0-9]{3}-(0[1-9]|1[0-2])$/.test(month)
  const ready = result?.owner === usuario?.id && result?.key === key
  const report = ready ? result.data : null
  const choices = options?.owner === usuario?.id ? options : null
  useEffect(() => {
    setError('')
    if (!usuario?.id || !validMonth) return
    const owner = usuario.id, controller = new AbortController()
    const search = new URLSearchParams({ month }); if (member) search.set('user', member)
    fetch(`/api/tasks/report?${search}`, { signal: controller.signal, cache: 'no-store' })
      .then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Error'); return data as ReportData })
      .then(data => { if (!controller.signal.aborted) { setResult({ owner, key, data }); setOptions({ owner, members: data.members, select: data.canSelectEmployees }) } })
      .catch(err => { if (!controller.signal.aborted) setError(err.message) })
    return () => controller.abort()
  }, [usuario?.id, key, month, member, validMonth])
  function print() {
    if (!report || error) return
    const popup = window.open('', '_blank', 'width=1000,height=760'); if (!popup) return
    const acts = report.tasks.map(task => ({ ...task, responsables: (task.assignedEmployees ?? []).map(person => ({ usuario_id: person.id, es_lider: person.leader })) }))
    const names = Object.fromEntries(report.tasks.flatMap(task => (task.assignedEmployees ?? []).map(person => [person.id, person.name])))
    popup.document.write(reportHtml({ acts, nombre: report.name, mes: report.month, intlLocale,
      nombrePorId: names, t, hoy: new Date(), metrics: report.metrics }))
    popup.document.close()
  }
  return <div id="reporte-content">
    <div id="reporte-controls" className={s.controles}><div className={s.acciones}>
      {choices?.select && <select aria-label={t('stratix.report.teamMember')} className={s.select} value={member || usuario?.id || ''} onChange={event => setMember(event.target.value)}>{choices.members.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}</select>}
      <label>{t('stratix.report.period')} <input aria-label={t('stratix.report.period')} type="month" value={month} onChange={e => setMonth(e.target.value)} className={s.select} /></label>
    </div></div>
    <div className={s.hoja}>
      <div className={s.head}>
        <div><Image src={STRATIX_LOGO_DATA} alt="Stratix Communications" width={176} height={59} style={{ height: 'auto' }} unoptimized />
          <div className={s.titulo}>{PRODUCTION_REPORT_SLOGAN}</div><p className={s.disclaimer}>{PRODUCTION_REPORT_DISCLAIMER}</p><div className={s.sub}>{t('tasks.report.subtitle')}</div></div>
        <div className={s.imprimirCabeza}><Button kind="print" onClick={print} deshabilitado={!report || !!error || !validMonth} /></div>
        <div className={s.periodo}><div className={s.dato}>{t('stratix.report.period')}</div><div className={s.valor}>{validMonth && periodoLargo(`${month}-01`, intlLocale)}</div></div>
      </div>
      <div className={s.persona}><div className={s.dato}>{t('stratix.report.teamMember')}</div><div className={s.nombre}>{report?.name || [usuario?.nombre, usuario?.apellido].filter(Boolean).join(' ')}</div></div>
      {error && <p role="alert">{error}</p>}
      {!validMonth && <p role="alert">{t('tasks.report.choosePeriod')}</p>}
      {!report && !error && validMonth && <p role="status">{t('common.loading')}</p>}
      {report?.metrics && <div className={s.resumen}>
        <div>{t('stratix.report.totalTasks')}: <strong>{report.metrics.totalTasks}</strong></div>
        <div>{t('stratix.report.completed')}: <strong>{report.metrics.completedTasks}</strong></div>
        <div>{t('stratix.dash.totalHours')}: <strong>{report.metrics.totalHours}</strong></div>
        <div>{t('tasks.report.completionRate')}: <strong>{report.metrics.completionRate}%</strong></div>
        <div>{t('stratix.detail.prodDays')}: <strong>{report.metrics.productionDays ?? 0}</strong></div>
      </div>}
      <div className={s.tableScroll}><table className={s.tabla}><thead><tr className={s.encabezado}>
        {(['stratix.report.colTask','stratix.report.colArea','stratix.report.colAssignee','stratix.new.start','tasks.report.deadline','stratix.report.colStatus'] as const).map(label => <th key={label} className={s.th}>{t(label)}</th>)}
        {report?.metrics && <><th className={s.th}>{t('stratix.new.hours')}</th><th className={s.th}>{t('stratix.report.colProdDays')}</th></>}
      </tr></thead><tbody>{report?.tasks.map(task => <ReportTableRow key={task.id} a={task} responsable={(task.assignedEmployees ?? []).map(person => person.name).join(', ') || '—'} showMetrics={!!report.metrics} />)}</tbody></table></div>
      {report && !report.tasks.length && !error && <div className={s.vacio}>{t('stratix.report.empty')}</div>}
    </div>
  </div>
}
