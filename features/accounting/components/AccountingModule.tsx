'use client'
import { useState } from 'react'
import { useApp } from '@/shared/context/AppContext'
import AppShell from '@/shared/components/AppShell'
import { ACCENT } from '../data'
import { totals } from '../aggregates'
import { fmt } from '../format'
import StatCard from './StatCard'
import TabButton from './TabButton'
import SummaryTab from './SummaryTab'
import SalesTab from './SalesTab'
import ReceivablesTab from './ReceivablesTab'
import BankingTab from './BankingTab'
import LabsTab from './LabsTab'

type TabKey = 'summary' | 'sales' | 'receivables' | 'banking' | 'labs'

const tabs: { key: TabKey; label: string; icon: string }[] = [
  { key: 'summary', label: 'Summary', icon: '📊' },
  { key: 'sales', label: 'Sales', icon: '💵' },
  { key: 'receivables', label: 'Receivables', icon: '📥' },
  { key: 'banking', label: 'Banking', icon: '🏦' },
  { key: 'labs', label: 'Laboratories', icon: '🧪' },
]

export default function AccountingModule() {
  const [tab, setTab] = useState<TabKey>('summary')
  const { bg, t1, t3, border } = useApp()
  return (
    <AppShell>
      <div className="-mx-6 -my-5 min-h-full px-7 py-6" style={{ background: bg }}>
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: t1 }}>Accounting</h1>
            <p className="mt-1 text-xs" style={{ color: t3 }}>Eminat Research · Sales, receivables & banking — March</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <StatCard label="Total Sales" value={fmt(totals.totalVentas)} color={ACCENT.purple} compact />
            <StatCard label="Receivables" value={fmt(totals.totalCobrar)} color={ACCENT.teal} compact />
            <StatCard label="Deposits" value={fmt(totals.totalDepositos)} color={ACCENT.green} compact />
          </div>
        </div>

        <div className="mb-5 flex gap-1 overflow-x-auto" style={{ borderBottom: `1px solid ${border}` }}>
          {tabs.map(t => (
            <TabButton key={t.key} icon={t.icon} label={t.label} active={tab === t.key} onClick={() => setTab(t.key)} />
          ))}
        </div>

        {tab === 'summary' && <SummaryTab />}
        {tab === 'sales' && <SalesTab />}
        {tab === 'receivables' && <ReceivablesTab />}
        {tab === 'banking' && <BankingTab />}
        {tab === 'labs' && <LabsTab />}
      </div>
    </AppShell>
  )
}
