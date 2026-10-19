import { describe, expect, it } from 'vitest'
import previewRows from '.'

const t = (key: string) => key
const BLANK = 'import.merge.noValue'
const SEGURO_AND_PHONE = { seguro: 'Cigna', telefono: '555-0002' }
const BLANKS = { notas: null, alergias: '  ', direccion: undefined }
const UNLABELLED = { id: 'p1', seguro: 'Aetna' }
const OUT_OF_ORDER = { email: 'ana@x.com', nombre: 'Ana' }

describe('previewRows', () => {
  it('names each written field with its label and shows its value', () => {
    expect(previewRows(SEGURO_AND_PHONE, t)).toEqual([
      { field: 'seguro', label: 'med.field.seguro', value: 'Cigna' },
      { field: 'telefono', label: 'med.field.telefono', value: '555-0002' },
    ])
  })

  it('says a field will be saved blank instead of showing nothing', () => {
    const values = previewRows(BLANKS, t).map(({ value }) => value)
    expect(values).toEqual([BLANK, BLANK, BLANK])
  })

  it('shows only fields the merge writes, and never one without a label', () => {
    const fields = previewRows(UNLABELLED, t).map(({ field }) => field)
    expect(fields).toEqual(['seguro'])
  })

  it('lists clinical fields before contacts, as the grid does', () => {
    const fields = previewRows(OUT_OF_ORDER, t).map(({ field }) => field)
    expect(fields).toEqual(['nombre', 'email'])
  })
})
