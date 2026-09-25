import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import EditorActions from './index'

vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: string) => key }) }))

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
})
