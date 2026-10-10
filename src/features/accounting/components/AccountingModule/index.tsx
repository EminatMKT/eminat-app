'use client'
import { AppShell } from '@/shared/components/shell'
import { TabBar } from '@/shared/components/ui'
import type { I18nKey } from '@/shared/i18n/types'
import { ACCENT } from '@/features/accounting/data'
import { totals } from '@/features/accounting/aggregates'
import { fmt } from '@/features/accounting/format'
import StatCard from '../StatCard'
import TabButton from '../TabButton'
import SummaryTab from '../SummaryTab'
import SalesTab from '../SalesTab'
import ReceivablesTab from '../ReceivablesTab'
import BankingTab from '../BankingTab'
import LabsTab from '../LabsTab'
import { useUserPreference, oneOf } from '@/shared/hooks'
import { useT } from '@/shared/i18n'
import s from './index.module.css'

const TAB_PREF_KEY = 'tab-accounting'
const SUMMARY_TAB = 'summary'
const SALES_TAB = 'sales'
const RECEIVABLES_TAB = 'receivables'
const BANKING_TAB = 'banking'
const LABS_TAB = 'labs'
const TAB_KEYS = [SUMMARY_TAB, SALES_TAB, RECEIVABLES_TAB, BANKING_TAB, LABS_TAB] as const
const DEFAULT_TAB = SUMMARY_TAB

type TabKey = (typeof TAB_KEYS)[number]
type TabItem = { key: TabKey; labelKey: I18nKey; icon: string }
type TabRenderer = {
  activeTab: TabKey
  item: TabItem
  onPick: (tab: TabKey) => void
  t: (key: I18nKey) => string
}

const tabs: TabItem[] = [
  { key: SUMMARY_TAB, labelKey: 'accounting.tabs.summary', icon: '📊' },
  { key: SALES_TAB, labelKey: 'accounting.tabs.sales', icon: '💵' },
  { key: RECEIVABLES_TAB, labelKey: 'accounting.tabs.receivables', icon: '📥' },
  { key: BANKING_TAB, labelKey: 'accounting.tabs.banking', icon: '🏦' },
  { key: LABS_TAB, labelKey: 'accounting.tabs.laboratories', icon: '🧪' },
]

const [summaryTab, salesTab, receivablesTab, bankingTab, labsTab] = tabs

function renderTab({ activeTab, item, onPick, t }: TabRenderer) {
  return (
    <TabButton
      key={item.key}
      icon={item.icon}
      label={t(item.labelKey)}
      active={activeTab === item.key}
      onClick={() => onPick(item.key)}
    />
  )
}

export default function AccountingModule() {
  const { t } = useT()
  // The open tab rebuilds with one click, so localStorage is enough and no table state is needed.
  const [tab, setTab] = useUserPreference<TabKey>(TAB_PREF_KEY, DEFAULT_TAB, oneOf(...TAB_KEYS))
  const tabProps = { activeTab: tab, onPick: setTab, t }
  return (
    <AppShell>
      <div className={s.page}>
        <div className={s.header}>
          <div>
            <h1 className={s.title}>{t('accounting.title')}</h1>
            <p className={s.subtitle}>{t('accounting.subtitle')}</p>
          </div>
          <div className={s.stats}>
            <StatCard
              label={t('accounting.stats.totalSales')}
              value={fmt(totals.totalVentas)}
              color={ACCENT.purple}
              compact
            />
            <StatCard
              label={t('accounting.stats.receivables')}
              value={fmt(totals.totalCobrar)}
              color={ACCENT.teal}
              compact
            />
            <StatCard
              label={t('accounting.stats.deposits')}
              value={fmt(totals.totalDepositos)}
              color={ACCENT.green}
              compact
            />
          </div>
        </div>

        <TabBar>
          {renderTab({ ...tabProps, item: summaryTab })}
          {renderTab({ ...tabProps, item: salesTab })}
          {renderTab({ ...tabProps, item: receivablesTab })}
          {renderTab({ ...tabProps, item: bankingTab })}
          {renderTab({ ...tabProps, item: labsTab })}
        </TabBar>

        {tab === SUMMARY_TAB && <SummaryTab />}
        {tab === SALES_TAB && <SalesTab />}
        {tab === RECEIVABLES_TAB && <ReceivablesTab />}
        {tab === BANKING_TAB && <BankingTab />}
        {tab === LABS_TAB && <LabsTab />}
      </div>
    </AppShell>
  )
}

// AccountingModule assembles the Accounting dashboard shell: localized KPIs, persisted tab choice,
// and the section tab that exposes summaries, sales, receivables, banking and lab performance.
