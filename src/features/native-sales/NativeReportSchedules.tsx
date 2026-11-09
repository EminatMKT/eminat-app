'use client'
import { type FormEvent, useCallback, useEffect, useState } from 'react'
import type { NativeRequest } from './NativeSalesModule'
import { useT } from '@/shared/i18n'
import s from './NativeSalesModule.module.css'

type Role='SUPERADMIN'|'ADMINISTRATOR'|'SALES_MANAGER'
type Schedule={id:string;version:number;cadence:'DAILY'|'WEEKLY';
  recipient_roles:Role[];enabled:boolean;last_status?:string|null;
  last_error_code?:string|null;last_run_at?:string|null}
const roles:Role[]=['SUPERADMIN','ADMINISTRATOR','SALES_MANAGER']

export default function NativeReportSchedules({request}:{request:NativeRequest}) {
  const { t } = useT()
  const [rows,setRows]=useState<Schedule[]>([])
  const [cadence,setCadence]=useState<'DAILY'|'WEEKLY'>('DAILY')
  const [recipientRoles,setRecipientRoles]=useState<Role[]>(['ADMINISTRATOR'])
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const load=useCallback(async () => {
    const result=await request('reports/schedules')
    setRows(Array.isArray(result.data)?result.data as Schedule[]:[])
  },[request])
  useEffect(() => {void load().catch(cause => setError(cause instanceof Error?cause.message:'SCHEDULES_UNAVAILABLE'))},[load])
  async function create(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();setBusy(true);setError('')
    try {
      await request('reports/schedules',{method:'POST',payload:{cadence,recipientRoles,enabled:false}})
      await load()
    } catch (cause) {setError(cause instanceof Error?cause.message:'SCHEDULE_SAVE_FAILED')}
    finally {setBusy(false)}
  }
  async function toggle(row:Schedule) {
    setBusy(true);setError('')
    try {
      await request('reports/schedules',{method:'PATCH',payload:{id:row.id,version:row.version,
        cadence:row.cadence,recipientRoles:row.recipient_roles,enabled:!row.enabled}})
      await load()
    } catch (cause) {setError(cause instanceof Error?cause.message:'SCHEDULE_SAVE_FAILED')}
    finally {setBusy(false)}
  }
  return <section className={s.panel}>
    <h2>{t('salesNative.scheduledSalesReports')}</h2>
    <p className={s.caption}>{t('salesNative.schedulesUseAmericaGuayaquilTimeDeliveryRemainsOff')}</p>
    <form className={s.form} onSubmit={event => void create(event)}>
      <div className={s.formGrid}>
        <label>{t('salesNative.auditCadence')} <select value={cadence} onChange={event => setCadence(event.target.value as 'DAILY'|'WEEKLY')}>
          <option value="DAILY">{t('salesNative.daily')}</option><option value="WEEKLY">{t('salesNative.auditWeekly')}</option>
        </select></label>
        <fieldset className={s.roleFieldset}><legend>{t('salesNative.recipientRoles')}</legend>{roles.map(role =>
          <label key={role} className={s.checkbox}><input type="checkbox" checked={recipientRoles.includes(role)}
            onChange={event => setRecipientRoles(current => event.target.checked ? [...current,role] : current.filter(item => item!==role))} />
            {role.replaceAll('_',' ')}</label>)}</fieldset>
      </div><button type="submit" disabled={busy || recipientRoles.length===0}>{t('salesNative.createDisabledSchedule')}</button>
    </form>
    {rows.length ? <ul className={s.scheduleList}>{rows.map(row => <li key={row.id}>
      <div><strong>{row.cadence==='DAILY'?t('salesNative.daily'):t('salesNative.weekly')} {t('salesNative.salesSummary')}</strong>
        <small>{row.recipient_roles.map(role => role.replaceAll('_',' ')).join(', ')} · {row.enabled?t('salesNative.enabled'):t('salesNative.disabled')}
          {row.last_status ? ` · ${t('salesNative.lastRun')}: ${row.last_status}` : ''}</small></div>
      <button type="button" disabled={busy} onClick={() => void toggle(row)}>{row.enabled?t('salesNative.disable'):t('salesNative.enable')}</button>
    </li>)}</ul> : <p className={s.empty}>{t('salesNative.noSchedulesConfigured')}</p>}
    {error && <p role="alert" className={s.error}>{error}</p>}
  </section>
}
