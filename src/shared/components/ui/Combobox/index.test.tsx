import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import Combobox from './index'

vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: string) => key }) }))

const OPTIONS = ['Kickoff', 'Budget']
const VALUE = 'Kick'
const PLACEHOLDER = 'Pick a topic'

describe('Combobox (free text)', () => {
  it('is a closed combobox box holding what was typed', () => {
    const html = renderToStaticMarkup(
      <Combobox options={OPTIONS} value={VALUE} onChange={vi.fn()} placeholder={PLACEHOLDER} />)
    expect(html).toContain('role="combobox"')
    expect(html).toContain(`value="${VALUE}"`)
    expect(html).toContain(`placeholder="${PLACEHOLDER}"`)
    expect(html).not.toContain('readonly')
    expect(html).not.toContain('role="listbox"')
  })
})
