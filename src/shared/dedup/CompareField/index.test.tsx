import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { CHECKBOX } from '@/shared/constants/dom'
import type { CompareControls } from '@/shared/dedup/DuplicatesTab/types'
import CompareField from '.'

vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: string) => key }) }))

type Tag = { id: string; label: string }
const textOf = ({ label }: Tag) => label
const CHECKBOX_INPUT = `type="${CHECKBOX}"`
const NO_CHOICES: Record<string, string> = {}
const controls = (choices: Record<string, string> = NO_CHOICES): CompareControls => ({
  choices,
  onChoose: vi.fn(),
  excludedIds: [],
  onToggleExcluded: vi.fn(),
})
const scalar = (choices?: Record<string, string>) => renderToStaticMarkup(
  <CompareField<Tag> labelKey="dedup.merge" field="seguro" values={['Aetna', 'Cigna']} controls={controls(choices)} />,
)

describe('CompareField', () => {
  it('resolves a scalar field with a left/right pick, not checkboxes', () => {
    const html = scalar()
    expect(html).toContain('aria-pressed')
    expect(html).not.toContain(CHECKBOX_INPUT)
  })

  // The merge sends the winner's value until the reviewer picks; the pill has to say so.
  it('shows the winner’s value as chosen until the reviewer picks', () => {
    const html = scalar()
    expect(html.indexOf('aria-pressed="true"')).toBeLessThan(html.indexOf('aria-pressed="false"'))
  })

  it('shows the reviewer’s pick once made', () => {
    const html = scalar({ seguro: 'Cigna' })
    expect(html.indexOf('aria-pressed="false"')).toBeLessThan(html.indexOf('aria-pressed="true"'))
  })

  it('resolves an array field with checkboxes, whatever its elements are', () => {
    const html = renderToStaticMarkup(
      <CompareField<Tag> labelKey="dedup.merge" values={[[{ id: '1', label: 'red' }], [{ id: '2', label: 'blue' }]]}
        textOf={textOf} controls={controls()} />,
    )
    expect(html).toContain(CHECKBOX_INPUT)
    expect(html).toContain('red')
    expect(html).toContain('blue')
    expect(html).not.toContain('aria-pressed')
  })

  it('draws nothing for an array field empty on both sides', () => {
    const html = renderToStaticMarkup(
      <CompareField<Tag> labelKey="dedup.merge" values={[[], []]} textOf={textOf} controls={controls()} />,
    )
    expect(html).toBe('')
  })
})
