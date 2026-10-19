import { describe, expect, it } from 'vitest'
import FIELD_MAPS from '@/features/medical/components/MedicalDuplicatesTab/fieldMaps'
import previewRows from '.'

const t = (key: string) => key
const BLANK = 'import.merge.noValue'
const SEGURO = { seguro: 'Cigna' }
const BLANKS = { notas: null, alergias: '  ', direccion: undefined }
const UNLABELLED = { id: 'p1', seguro: 'Aetna' }
const WITH_CONTACTS = { seguro: 'Cigna', telefono: '555-0002', email: 'ana@x.com' }

describe('previewRows', () => {
  it('names each written field with its label and shows its value', () => {
    expect(previewRows(SEGURO, t)).toEqual([{ field: 'seguro', label: 'med.field.seguro', value: 'Cigna' }])
  })

  it('says a field will be saved blank instead of showing nothing', () => {
    const values = previewRows(BLANKS, t).map(({ value }) => value)
    expect(values).toEqual([BLANK, BLANK, BLANK])
  })

  it('shows only fields the merge writes, and never one without a label', () => {
    const fields = previewRows(UNLABELLED, t).map(({ field }) => field)
    expect(fields).toEqual(['seguro'])
  })

  // The scalar `telefono`/`email` column holds one value; the contact lines list every survivor.
  it('leaves phone and email to the contact lines, never the single scalar column', () => {
    const fields = previewRows(WITH_CONTACTS, t).map(({ field }) => field)
    expect(fields).toEqual(['seguro'])
  })

  it('follows the grid’s own field order', () => {
    const everyField = Object.fromEntries(Object.keys(FIELD_MAPS.labelKeys).map(field => [field, field]))
    const fields = previewRows(everyField, t).map(({ field }) => field)
    expect(fields).toEqual(Object.keys(FIELD_MAPS.labelKeys))
  })
})
