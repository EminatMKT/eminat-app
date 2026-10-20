import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { createElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import MEDICAL_TABS from '@/features/medical/constants/tabs'
import MedicalPatientsTab from '.'

type StubProps = { children?: ReactNode; label?: string; badge?: number }

const PENDING_PAIRS = 5

const stubs = vi.hoisted(() => ({
  view: { current: '' },
  tabButton: vi.fn((_props: StubProps) => null),
  patientList: vi.fn(() => null),
  duplicates: vi.fn(() => null),
  pendingCount: vi.fn(() => 0),
}))

vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: string) => key }) }))
vi.mock('@/shared/hooks', () => ({ useTabPreference: () => [stubs.view.current, vi.fn()] }))
vi.mock('@/shared/components/ui', () => ({ ColorBadge: () => null, TabBar: (props: StubProps) => props.children, TabButton: stubs.tabButton }))
vi.mock('../PacientesTab', () => ({ default: stubs.patientList }))
vi.mock('../MedicalDuplicatesTab', () => ({ default: stubs.duplicates }))
vi.mock('./usePendingDuplicateCount', () => ({ default: stubs.pendingCount }))

const props = { onNewPatient: vi.fn(), onImportPatients: vi.fn() }
const renderView = (view: string) => {
  stubs.view.current = view
  return renderToStaticMarkup(createElement(MedicalPatientsTab, props))
}
const tabLabels = () => stubs.tabButton.mock.calls.map(call => call[0].label)

describe('MedicalPatientsTab', () => {
  beforeEach(() => vi.clearAllMocks())

  it('offers both views: the list and the duplicates review', () => {
    renderView(MEDICAL_TABS.patientList)
    expect(tabLabels()).toEqual(['med.patientListTab', 'dedup.medicalTab'])
  })

  it('shows the patient list, and only it, on the list view', () => {
    renderView(MEDICAL_TABS.patientList)
    expect(stubs.patientList).toHaveBeenCalled()
    expect(stubs.duplicates).not.toHaveBeenCalled()
  })

  it('badges the duplicates tab, and only it, with the pending-pair count for the open view', () => {
    stubs.pendingCount.mockReturnValue(PENDING_PAIRS)
    renderView(MEDICAL_TABS.patientList)
    const badges = stubs.tabButton.mock.calls.map(call => call[0].badge)
    expect(badges).toEqual([undefined, PENDING_PAIRS])
    expect(stubs.pendingCount).toHaveBeenCalledWith(MEDICAL_TABS.patientList)
  })

  it('shows the duplicates review, without the list, on the duplicates view', () => {
    renderView(MEDICAL_TABS.patientDuplicates)
    expect(stubs.duplicates).toHaveBeenCalled()
    expect(stubs.patientList).not.toHaveBeenCalled()
  })
})
