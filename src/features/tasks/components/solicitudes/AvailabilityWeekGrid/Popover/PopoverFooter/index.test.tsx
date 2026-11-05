import {
  describe,
  it,
  expect,
  vi,
} from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import PopoverFooter from './index'

const I18N_MODULE = '@/shared/i18n'

vi.mock(I18N_MODULE, () => ({ useT: () => ({ t: (key: string) => key }) }))

const DISABLED_ATTR = 'disabled'
const CONFIRM_MESSAGE = 'Remove this range?'
const onSave = vi.fn()
const onRemove = vi.fn()

describe('PopoverFooter', () => {
  it('disables confirm while canSave is false', () => {
    const html = renderToStaticMarkup(
      <PopoverFooter
        confirmationMessage={CONFIRM_MESSAGE}
        canSave={false}
        onSave={onSave}
        onRemove={onRemove}
      />,
    )

    expect(html).toContain(DISABLED_ATTR)
  })

  it('enables confirm once canSave is true', () => {
    const html = renderToStaticMarkup(
      <PopoverFooter
        confirmationMessage={CONFIRM_MESSAGE}
        canSave={true}
        onSave={onSave}
        onRemove={onRemove}
      />,
    )

    expect(html).not.toContain(DISABLED_ATTR)
  })
})
