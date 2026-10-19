import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { CHECKBOX } from '@/shared/constants/dom'
import type { CompareControls } from '@/shared/dedup'
import reviewFixture from '../reviewFixture'
import comparePacientes from '.'

vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: string) => key }) }))

const t = (key: string) => key
const CHECKBOX_INPUT = `type="${CHECKBOX}"`
const controls: CompareControls = {
  choices: {},
  onChoose: () => {},
  excludedIds: [],
  onToggleExcluded: () => {},
}
const AETNA = { seguro: 'Aetna' }
const CIGNA = { seguro: 'Cigna' }
const NO_FIELDS = {}
const PHONE_A = { telefono: [{ id: 'c1', valor: '555-0001' }] }
const PHONE_B = { telefono: [{ id: 'c2', valor: '555-0002' }] }
const draw = (a: ReturnType<typeof reviewFixture>, b: ReturnType<typeof reviewFixture>) =>
  renderToStaticMarkup(<>{comparePacientes(a, b, controls, t)}</>)

describe('comparePacientes', () => {
  it('shows a comparison row for every differing field', () => {
    expect(draw(reviewFixture(AETNA), reviewFixture(CIGNA))).toContain('med.field.seguro')
  })

  it('offers every phone of both patients as a checkbox', () => {
    const html = draw(reviewFixture(NO_FIELDS, PHONE_A), reviewFixture(NO_FIELDS, PHONE_B))
    expect(html).toContain('med.field.telefono')
    expect(html).toContain('555-0001')
    expect(html).toContain('555-0002')
    expect(html).toContain(CHECKBOX_INPUT)
  })

  it('leaves out a contact type neither patient has', () => {
    expect(draw(reviewFixture(AETNA), reviewFixture(CIGNA))).not.toContain('med.field.email')
  })

  it('shows the no-diff message when nothing differs and no contact exists', () => {
    expect(draw(reviewFixture(), reviewFixture())).toContain('dedup.noFieldDiffs')
  })
})
