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

type StubProps = { children?: ReactNode; label?: string }

const stubs = vi.hoisted(() => ({
  view: { current: '' },
  tabButton: vi.fn((_props: StubProps) => null),
  patientList: vi.fn(() => null),
  duplicates: vi.fn(() => null),
}))

vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: string) => key }) }))
vi.mock('@/shared/hooks', () => ({ useTabPreference: () => [stubs.view.current, vi.fn()] }))
vi.mock('@/shared/components/ui', () => ({ TabBar: (props: StubProps) => props.children, TabButton: stubs.tabButton }))
vi.mock('../PacientesTab', () => ({ default: stubs.patientList }))
vi.mock('../MedicalDuplicatesTab', () => ({ default: stubs.duplicates }))

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

  it('shows the duplicates review, without the list, on the duplicates view', () => {
    renderView(MEDICAL_TABS.patientDuplicates)
    expect(stubs.duplicates).toHaveBeenCalled()
    expect(stubs.patientList).not.toHaveBeenCalled()
  })
})
