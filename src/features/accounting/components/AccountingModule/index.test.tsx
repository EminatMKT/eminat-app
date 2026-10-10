import { describe, expect, it, vi } from 'vitest'
import type { ComponentProps, ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import AccountingModule from './index'
import TabButton from '../TabButton'

type TabButtonProps = ComponentProps<typeof TabButton>

const { tabs, setTab } = vi.hoisted(() => ({
  tabs: new Array<TabButtonProps>(),
  setTab: vi.fn(),
}))

vi.mock('@/shared/components/shell', () => ({ AppShell: ({ children }: { children: ReactNode }) => <>{children}</> }))
vi.mock('@/shared/components/ui', () => ({ TabBar: ({ children }: { children: ReactNode }) => <nav>{children}</nav> }))
vi.mock('@/shared/hooks', () => ({
  oneOf: () => () => true,
  useUserPreference: () => ['summary', setTab],
}))
vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: string) => key }) }))
vi.mock('../TabButton', () => ({
  default: (props: TabButtonProps) => {
    tabs.push(props)
    return <button type="button">{props.label}</button>
  },
}))
vi.mock('../StatCard', () => ({
  default: ({ label, value }: { label: string; value: string }) => <p>{label}:{value}</p>,
}))
vi.mock('../SummaryTab', () => ({ default: () => <section /> }))
vi.mock('../SalesTab', () => ({ default: () => null }))
vi.mock('../ReceivablesTab', () => ({ default: () => null }))
vi.mock('../BankingTab', () => ({ default: () => null }))
vi.mock('../LabsTab', () => ({ default: () => null }))

describe('AccountingModule', () => {
  it('renders the localized accounting header and KPI labels', () => {
    const html = renderToStaticMarkup(<AccountingModule />)
    expect(html).toContain('accounting.title')
    expect(html).toContain('accounting.subtitle')
    expect(html).toContain('accounting.stats.totalSales')
    expect(html).toContain('accounting.stats.receivables')
    expect(html).toContain('accounting.stats.deposits')
  })

  it('offers the fixed accounting tabs and stores the chosen one', () => {
    tabs.length = 0
    renderToStaticMarkup(<AccountingModule />)
    expect(tabs.map(tab => tab.label)).toEqual([
      'accounting.tabs.summary',
      'accounting.tabs.sales',
      'accounting.tabs.receivables',
      'accounting.tabs.banking',
      'accounting.tabs.laboratories',
    ])
    tabs[1].onClick()
    expect(setTab).toHaveBeenCalledWith('sales')
  })
})
