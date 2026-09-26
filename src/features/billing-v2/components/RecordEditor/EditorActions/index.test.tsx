import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import EditorActions from './index'

vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: string) => key }) }))

// Fixtures, not shipped copy.
const REASON = 'fixture reason'
const FAILURE = 'fixture failure'
const ignore = async () => undefined
const draw = (busy: boolean, onDelete?: () => Promise<void>) => renderToStaticMarkup(
  <EditorActions busy={busy} onCancel={ignore} onSave={ignore} onDelete={onDelete} />,
)

describe('EditorActions', () => {
  it('offers no deletion for a record that does not exist yet', () => {
    expect(draw(false)).not.toContain('common.delete')
    expect(draw(false, ignore)).toContain('common.delete')
  })

  // A save in flight disables the button that would send it a second time.
  it('disables saving while a save is travelling', () => {
    expect(draw(false)).not.toContain('disabled')
    expect(draw(true)).toContain('disabled')
  })

  // Nothing to save, or something required missing: Save is disabled and the reason is in view.
  it('disables Save while it is held back, and says why beside it', () => {
    const html = renderToStaticMarkup(<EditorActions busy={false} blocked={REASON} onCancel={ignore} onSave={ignore} />)
    expect(html).toContain('disabled')
    expect(html).toContain(REASON)
  })

  // One box holds the reason and then the buttons, so a narrow footer can wrap the reason above.
  it('draws the reason first, inside one box with the buttons', () => {
    const html = renderToStaticMarkup(<EditorActions busy={false} blocked={REASON} onCancel={ignore} onSave={ignore} />)
    expect(html.startsWith('<div')).toBe(true)
    expect(html.indexOf(REASON)).toBeLessThan(html.indexOf('billing.save'))
  })

  // The error that belongs to no field goes next to the action that failed, as an alert.
  it('says a write failed next to the actions', () => {
    const html = renderToStaticMarkup(<EditorActions busy={false} failure={FAILURE} onCancel={ignore} onSave={ignore} />)
    expect(html).toContain('role="alert"')
    expect(html).toContain(FAILURE)
    expect(html).not.toContain('disabled')
  })
})
