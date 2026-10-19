'use client'
import { useEffect, useState } from 'react'
import AppShell from '@/shared/components/shell/AppShell'
import { supabase } from '@/shared/db/supabase'
import s from './SalesModule.module.css'

type Summary = { revenue: string; due: number; renewalRate: number; byStatus: Record<string, number> }

export default function FinanceSummary() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let cancelled = false
    void supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) throw new Error('SESSION_REQUIRED')
      const response = await fetch('/api/integrations/annie/sales/finance-summary', {
        cache: 'no-store', headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const body = await response.json() as Summary & { code?: string }
      if (!response.ok) throw new Error(body.code ?? 'FINANCE_UNAVAILABLE')
      if (!cancelled) setSummary(body)
    }).catch(cause => { if (!cancelled) setError(cause instanceof Error ? cause.message : 'FINANCE_UNAVAILABLE') })
    return () => { cancelled = true }
  }, [])
  return <AppShell title="Sales — Financial summary" activeTab="finance" visibleTabs={[]}>
    <section className={s.page}>
      <header className={s.header}><div><p className={s.eyebrow}>ANNIE · LIVE</p><h1>Financial summary</h1>
        <p className={s.muted}>ANNIE payment order totals for real memberships. Accounting balances remain in QuickBooks.</p></div>
        <span className={s.badge}>Finance · Read only</span></header>
      {!summary && !error && <p role="status">Loading summary…</p>}
      {error && <p role="alert" className={s.error}>{error}</p>}
      {summary && <><div className={s.stats}>
        <article><span>Paid order total</span><strong>{summary.revenue}</strong></article>
        <article><span>Renewals due within 30 days</span><strong>{summary.due}</strong></article>
        <article><span>Paid renewal rate</span><strong>{summary.renewalRate}%</strong></article>
      </div><div className={s.card}><h2>Payment order status</h2><ul className={s.list}>
        {Object.entries(summary.byStatus).map(([status, count]) => <li key={status}><span>{status.replaceAll('_', ' ')}</span><strong>{count}</strong></li>)}
      </ul></div></>}
    </section>
  </AppShell>
}
