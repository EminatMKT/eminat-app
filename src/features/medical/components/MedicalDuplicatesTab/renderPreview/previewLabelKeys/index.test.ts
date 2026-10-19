import { describe, expect, it } from 'vitest'
import FIELD_MAPS from '@/features/medical/components/MedicalDuplicatesTab/fieldMaps'
import CONTACT_FIELDS from '@/features/medical/components/MedicalDuplicatesTab/comparePacientes/contactFields'
import PREVIEW_LABEL_KEYS from '.'

describe('PREVIEW_LABEL_KEYS', () => {
  it('labels every clinical field with the key the comparison grid uses', () => {
    for (const [field, labelKey] of Object.entries(FIELD_MAPS.labelKeys)) {
      expect(PREVIEW_LABEL_KEYS[field]).toBe(labelKey)
    }
  })

  // `FIELD_MAPS` leaves phone and email out on purpose; the merge still writes them.
  it('labels both contact types with the key their checkboxes use', () => {
    for (const { key, labelKey } of CONTACT_FIELDS) expect(PREVIEW_LABEL_KEYS[key]).toBe(labelKey)
  })
})
