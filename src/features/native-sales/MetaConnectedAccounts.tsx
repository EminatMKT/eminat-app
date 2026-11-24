'use client'
import {useEffect,useState} from 'react'
import {useT} from '@/shared/i18n'
import {useMetaWorkspaces} from './useMetaWorkspaces'
import {metaSettingsHref} from './meta-navigation'
import {statusCopy,type Snapshot} from './meta-connection-metadata'
import {sessionFetch} from './session-fetch'
import s from './MetaConnections.module.css'

/** Marketing reads the same authorized metadata projection; management stays central. */
export default function MetaConnectedAccounts() {
  const {t}=useT()
  const {organizations,loading,error}=useMetaWorkspaces()
  const [organization,setOrganization]=useState('')
  const selected=organizations.find(org=>org.organizationId===organization)
  return <section className={`${s.connections} ${s.marketing}`} aria-label={t('meta.connectedAccounts')}>
    <h2>{t('meta.connectedAccounts')}</h2>
    <p>{t('meta.marketingDescription')}</p>
    {loading ? <p role="status">{t('common.loading')}</p> : error || !organizations.length
      ? <p role="status">{t('meta.accessRequired')}</p> : <>
      <label>{t('meta.organization')} <select value={selected?.organizationId ?? ''} onChange={event=>setOrganization(event.target.value)}>
        <option value="">{t('meta.chooseOrganization')}</option>
        {organizations.map(org=><option key={org.organizationId} value={org.organizationId}>{org.name}</option>)}
      </select></label>
      {selected && <CompanyAccounts key={selected.organizationId} organization={selected.organizationId} organizationName={selected.name} />}
    </>}
  </section>
}
function CompanyAccounts({organization,organizationName}:{organization:string;organizationName:string}) {
  const {t}=useT()
  const [snapshot,setSnapshot]=useState<Snapshot|null>(null)
  const [error,setError]=useState(false)
  const [company,setCompany]=useState('')
  useEffect(()=>{
    let cancelled=false
    async function load(){
      try {
        const body=await sessionFetch('social/connections',{organizationId:organization}) as {data:Snapshot}
        if(!body.data.canManage)throw new Error('META_ACCESS_UNAVAILABLE')
        if(!cancelled)setSnapshot(body.data)
      } catch {if(!cancelled)setError(true)}
    }
    void load()
    return()=>{cancelled=true}
  },[organization])
  if(error)return <p role="alert">{t('meta.accessRequired')}</p>
  if(!snapshot)return <p role="status">{t('common.loading')}</p>
  const companies=new Map(snapshot.companies.map(item=>[item.code,item.name]))
  // Defensive client projection; the API independently enforces both organization and company access.
  const integrations=snapshot.integrations.filter(item=>companies.has(item.company_code) && (!company || item.company_code===company))
  const status=(value:string)=>t(statusCopy[value] ?? 'meta.state.unknown')
  return <>
    <label>{t('meta.company')} <select value={company} onChange={event=>setCompany(event.target.value)}>
      <option value="">{t('meta.allCompanies')}</option>
      {snapshot.companies.map(item=><option key={item.code} value={item.code}>{item.name}</option>)}
    </select></label>
    <p><a className={s.back} href={metaSettingsHref(organization,company)}>{t('meta.manageConnections')}</a></p>
    {!integrations.length && <p>{t('meta.noConnections')}</p>}
    <div className={s.connectionGrid}>{integrations.map(connection=><article key={connection.id} className={s.card}>
      <h3>{companies.get(connection.company_code)}</h3>
      <p>{t('meta.organization')}: {organizationName}</p>
      <p>{t('meta.connectionStatus')}: {status(connection.status)}</p>
      <p>{t('meta.permissionHealth')}: {connection.grant?.health_error ? status(connection.grant.health_error) : connection.grant?.checked_at ? status(connection.grant.status) : t('meta.notChecked')}</p>
      <p>{t('meta.permissions')}: {connection.granted_permissions.length ? connection.granted_permissions.join(', ') : t('meta.notChecked')}</p>
      <ul>{snapshot.assets.filter(asset=>asset.integrationId===connection.id && asset.company_code===connection.company_code).map(asset=><li key={asset.id}>
        <strong>{asset.display_name}</strong> · {t(asset.asset_type==='instagram'?'meta.instagram':'meta.facebookPage')} · {status(asset.status)}
      </li>)}</ul>
      <a className={s.back} href={metaSettingsHref(organization,connection.company_code)}>{t('meta.manageConnections')}</a>
    </article>)}</div>
  </>
}
