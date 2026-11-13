import { renderToStaticMarkup } from 'react-dom/server'
import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { EDITOR_COPY } from '../constants'
import EditorActions from './index'

const { I18N_MODULE } = vi.hoisted(() => ({ I18N_MODULE: '@/shared/i18n' }))

vi.mock(I18N_MODULE, () => ({
  useT: () => ({ t: (key: string) => key }),
}))

const SUCCESS_MESSAGE = EDITOR_COPY.saved
const ERROR_MESSAGE = EDITOR_COPY.saveError
const ignoreAction = () => undefined

describe('EditorActions', () => {
  it('renders shared cancel and save controls with a pending guard', () => {
    const html = renderToStaticMarkup(
      <EditorActions
        status={EDITOR_COPY.savingStatus}
        message={null}
        onCancel={ignoreAction}
        onSave={ignoreAction}
      />,
    )

    expect(html).toContain(EDITOR_COPY.cancel)
    expect(html).toMatch(EDITOR_COPY.saving)
    expect(html).toMatch(/disabled=""/)
    expect(html).toMatch(/aria-busy="true"/)
    expect(html).toMatch(/type="button"/)
  })

  it('announces successful completion in a live status region', () => {
    const html = renderToStaticMarkup(
      <EditorActions
        status={EDITOR_COPY.savedStatus}
        message={SUCCESS_MESSAGE}
        onCancel={ignoreAction}
        onSave={ignoreAction}
      />,
    )

    expect(html).toContain(`role="${EDITOR_COPY.statusRole}"`)
    expect(html).toContain(SUCCESS_MESSAGE)
  })

  it('announces a recoverable save error in an alert region', () => {
    const html = renderToStaticMarkup(
      <EditorActions
        status={EDITOR_COPY.errorStatus}
        message={ERROR_MESSAGE}
        onCancel={ignoreAction}
        onSave={ignoreAction}
      />,
    )

    expect(html).toContain(`role="${EDITOR_COPY.alertRole}"`)
    expect(html).toContain(ERROR_MESSAGE)
  })
})

// EditorActions keeps save/cancel controls and operation feedback separate from editor state.
