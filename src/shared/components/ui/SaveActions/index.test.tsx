import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { SaveErrors } from './types'
import SaveActions from './index'

vi.mock('@/shared/i18n', () => ({
  useT: () => ({ t: (key: string, vars?: Record<string, string>) => [key, vars?.fields].filter(Boolean).join('|') }),
}))

// Fixtures, not shipped copy.
const SAVE = 'fixture save'
const HOLD = 'fixture hold'
const FAILURE = 'fixture failure'
const EXTRA = 'fixture extra action'
const FIELDS = [{ name: 'amount', label: 'Amount', blank: false }]
const WRONG = { amount: 'error.key' }
const DISABLED_SAVE = new RegExp(`<button[^>]*disabled[^>]*>${SAVE}`)
const ignore = () => undefined

type Drawn = { errors?: SaveErrors; busy?: boolean; hold?: string | null; failure?: string | null; extra?: boolean }
const draw = ({ errors = {}, busy = false, hold, failure, extra }: Drawn = {}) => renderToStaticMarkup(
  <SaveActions errors={errors} fields={FIELDS} busy={busy} hold={hold} failure={failure} saveLabel={SAVE}
    onCancel={ignore} onSave={ignore}>
    {extra && EXTRA}
  </SaveActions>,
)

describe('SaveActions', () => {
  it('lets Save through when nothing holds it', () => {
    expect(draw()).not.toContain('disabled')
    expect(draw()).toContain('common.cancel')
  })

  // A save in flight disables the button that would send it a second time.
  it('disables Save while a save is travelling', () => {
    expect(draw({ busy: true })).toContain('disabled')
  })

  // Any unresolved error holds Save, and the reason names the field beside the button.
  it('disables Save while any field holds an error, naming it beside the button', () => {
    const html = draw({ errors: WRONG })
    expect(html).toMatch(/<button[^>]*disabled[^>]*>fixture save/)
    expect(html).toContain('common.saveBlocked.invalid|Amount')
    expect(html).toContain('role="status"')
  })

  // A hold that is not validation —nothing changed— also disables Save and is said the same way.
  it('disables Save on a hold of the caller, and says it', () => {
    const html = draw({ hold: HOLD })
    expect(html).toMatch(DISABLED_SAVE)
    expect(html).toContain(HOLD)
  })

  // The caller's hold is on top of the errors, never instead: the errors are what is said.
  it('says the errors, not the caller\'s hold, while both hold Save', () => {
    const html = draw({ errors: WRONG, hold: HOLD })
    expect(html).toContain('common.saveBlocked.invalid|Amount')
    expect(html).not.toContain(HOLD)
  })

  // One box holds the reason and then the buttons, so a narrow footer can wrap the reason above.
  it('draws the reason first, inside one box with the buttons', () => {
    const html = draw({ hold: HOLD })
    expect(html.startsWith('<div')).toBe(true)
    expect(html.indexOf(HOLD)).toBeLessThan(html.indexOf(SAVE))
  })

  // The error that belongs to no field goes next to the action that failed, as an alert.
  it('says a write failed next to the actions, and only that while it is shown', () => {
    const html = draw({ failure: FAILURE, hold: HOLD })
    expect(html).toContain('role="alert"')
    expect(html).toContain(FAILURE)
    expect(html).not.toContain(HOLD)
    expect(html).toMatch(DISABLED_SAVE)
  })

  // A form may put its own actions —a deletion— in the footer, before Cancel and Save.
  it('draws the caller\'s own actions before Cancel and Save', () => {
    const html = draw({ extra: true })
    expect(html.indexOf(EXTRA)).toBeLessThan(html.indexOf('common.cancel'))
  })
})
