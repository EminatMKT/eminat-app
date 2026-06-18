'use client'
import { useState } from 'react'
import AppShell from '@/shared/components/AppShell'
import { ACCENT } from '../data'
import { totals } from '../aggregates'
import { fmt } from '../format'
import KPI from './KPI'
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
  return (
    <AppShell>
      <div className="-mx-6 -my-5 min-h-full bg-gray-50 px-7 py-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Accounting</h1>
            <p className="mt-1 text-xs text-gray-500">Eminat Research · Sales, receivables & banking — March</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <KPI label="Total Sales" value={fmt(totals.totalVentas)} accent={ACCENT.purple} />
            <KPI label="Receivables" value={fmt(totals.totalCobrar)} accent={ACCENT.teal} />
            <KPI label="Deposits" value={fmt(totals.totalDepositos)} accent={ACCENT.green} />
          </div>
        </div>

        <div className="mb-5 flex gap-1 overflow-x-auto border-b border-gray-200">
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
