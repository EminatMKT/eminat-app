import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import type { AddRangeButtonProps } from '../types'
import AddRangeButton from './index'

vi.mock('@/shared/i18n', () => ({
  useT: () => ({ t: (key: string) => key }),
}))

const LABEL = 'Add Monday range'
const ignoreAdd = () => undefined
const PROPS: AddRangeButtonProps = {
  label: LABEL,
  onAdd: ignoreAdd,
}

describe('AddRangeButton', () => {
  it('renders a labeled, non-primary add control with an explicit button type', () => {
    const element = createElement(AddRangeButton, PROPS)
    const html = renderToStaticMarkup(element)

    expect(html).toContain(LABEL)
    expect(html).toContain('type="button"')
  })
})

// AddRangeButton keeps the day-level add action secondary to the editor form action.
