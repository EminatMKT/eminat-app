import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { CompareControls } from '@/shared/dedup'
import type { Paciente } from '@/features/medical/types'
import reviewFixture from '@/features/medical/components/MedicalDuplicatesTab/reviewFixture'
import type { PatientUnderReview } from '@/features/medical/components/MedicalDuplicatesTab/types'
import renderPreview from '.'

vi.mock('@/shared/context/AppContext', () => ({ useApp: () => ({ usuario: null }) }))

const t = (key: string) => key
const HEADING = 'dedup.willBeSaved'
const SEGURO = { seguro: 'Cigna' }
// What the RPC receives: exactly one scalar phone, whatever the reviewer kept.
const ONE_SCALAR_PHONE = { telefono: '555-0001' }
const NO_FIELDS: Partial<Paciente> = {}
const WINNER_CONTACTS: Partial<PatientUnderReview> = { telefono: [{ id: 'w1', valor: '555-0001' }] }
const LOSER_CONTACTS: Partial<PatientUnderReview> = { telefono: [{ id: 'l1', valor: '555-0002' }] }
const NOTHING_EXCLUDED: CompareControls = {
  choices: {},
  onChoose: () => {},
  excludedIds: [],
  onToggleExcluded: () => {},
}
const winner = reviewFixture(NO_FIELDS, WINNER_CONTACTS)
const loser = reviewFixture(NO_FIELDS, LOSER_CONTACTS)
const draw = (values: Record<string, unknown>) =>
  renderToStaticMarkup(<>{renderPreview(winner, loser, values, NOTHING_EXCLUDED, t)}</>)

describe('renderPreview', () => {
  it('draws a headed box with each field the merge will save', () => {
    const html = draw(SEGURO)
    expect(html).toContain(HEADING)
    expect(html).toContain('med.field.seguro')
    expect(html).toContain('Cigna')
  })

  // The reported bug: the RPC's single scalar `telefono` hid the second phone that stays.
  it('shows both phones that stay on the winner, not just the scalar one', () => {
    const html = draw(ONE_SCALAR_PHONE)
    expect(html).toContain('555-0001, 555-0002')
  })
})
