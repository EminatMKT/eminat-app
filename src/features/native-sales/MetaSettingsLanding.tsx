'use client'
import AppShell from '@/shared/components/shell/AppShell'
import {useT} from '@/shared/i18n'
import {metaSettingsHref} from './meta-navigation'
import s from './MetaConnections.module.css'
export default function MetaSettingsLanding({view,organization,company}:{view:'settings'|'integrations';organization?:string;company?:string}) {
  const {t}=useT()
  const settings=view==='settings'
  return <AppShell><div className={s.workspace}>
    {!settings && <a className={s.back} href={metaSettingsHref(organization,company,'/settings')}>{t('meta.settings')}</a>}
    <h1>{t(settings?'meta.settings':'meta.integrations')}</h1>
    <section className={s.card}>
      <h2>{t(settings?'meta.integrations':'meta.integrationTitle')}</h2>
      <p>{t('meta.dashboardDescription')}</p>
      <a className={s.back} href={metaSettingsHref(organization,company,settings?'/settings/integrations':undefined)}>
        {t(settings?'meta.openIntegrations':'meta.manageConnections')}
      </a>
    </section>
  </div></AppShell>
}
