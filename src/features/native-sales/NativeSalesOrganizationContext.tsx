'use client'
import type { ReactNode } from 'react'
import type { SalesOrganizationOption } from '@/server/sales-native/auth'
import { useT } from '@/shared/i18n'
import s from './NativeSalesModule.module.css'

export default function NativeSalesOrganizationContext({ organizations, selectedId, children }: {
  organizations: SalesOrganizationOption[]; selectedId?: string; children: ReactNode
}) {
  const { t } = useT()
  return <>
    <section className={s.organizationContext} aria-label={t('sales.organization.context')}>
      <form action="/sales-native" method="get">
        <label htmlFor="sales-organization">{t('sales.organization.label')}</label>
        <select id="sales-organization" name="organization" defaultValue={selectedId ?? ''} required>
          <option value="" disabled>{t('sales.organization.choose')}</option>
          {organizations.map(option => <option key={option.organizationId} value={option.organizationId}>
            {option.name} · {option.role}
          </option>)}
        </select>
        <button type="submit">{t('sales.organization.open')}</button>
      </form>
      <p>{t('sales.organization.activeOnly')}</p>
    </section>
    {children ?? <section className={s.main}>
      <h1>{t('sales.organization.chooseTitle')}</h1><p>{t('sales.organization.chooseDescription')}</p>
    </section>}
  </>
}
