import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import pacienteFixture from '@/features/medical/hooks/usePacientes/fixture'
import type { CompareControls } from '@/shared/dedup'
import comparePacientes from '.'

vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: string) => key }) }))

const t = (key: string) => key
const controls: CompareControls = {
  choices: {},
  onChoose: () => {},
  excludedIds: [],
  onToggleExcluded: () => {},
}

describe('comparePacientes', () => {
  it('shows a comparison row for every differing field', () => {
    const a = pacienteFixture({ seguro: 'Aetna' })
    const b = pacienteFixture({ seguro: 'Cigna' })
    const html = renderToStaticMarkup(<>{comparePacientes(a, b, controls, t)}</>)
    expect(html).toContain('med.field.seguro')
  })

  it('shows the no-diff message when nothing differs', () => {
    const a = pacienteFixture()
    const b = pacienteFixture()
    const html = renderToStaticMarkup(<>{comparePacientes(a, b, controls, t)}</>)
    expect(html).toContain('dedup.noFieldDiffs')
  })
})
