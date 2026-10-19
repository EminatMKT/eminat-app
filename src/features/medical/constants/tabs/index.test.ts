import { describe, it, expect } from 'vitest'
import { SUB_ITEMS } from '@/shared/components/shell/appShellConfig'
import MEDICAL_TABS from './index'

describe('Medical tab catalog', () => {
  it('offers exactly the sections the sidebar lists, and opens on one of them', () => {
    expect([...MEDICAL_TABS.sections]).toEqual(SUB_ITEMS.medical.map(item => item.tab))
    expect(MEDICAL_TABS.sections).toContain(MEDICAL_TABS.defaultSection)
  })

  // Duplicates review is about patient records, so it lives inside Patients, not beside it.
  it('keeps Duplicates out of the sections and inside the Patients views', () => {
    expect(MEDICAL_TABS.sections).not.toContain(MEDICAL_TABS.patientDuplicates)
    expect([...MEDICAL_TABS.patientViews]).toEqual([MEDICAL_TABS.patientList, MEDICAL_TABS.patientDuplicates])
  })

  // A shared key would make picking a Patients sub-tab change which Medical section opens.
  it('remembers the Patients sub-tab under its own preference scope', () => {
    expect(MEDICAL_TABS.patientsScope).toBe('medical-pacientes')
  })
})
