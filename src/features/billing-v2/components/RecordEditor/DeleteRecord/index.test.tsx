import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import DeleteRecord from './index'

vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: string) => key }) }))

const confirm = vi.fn()

describe('DeleteRecord', () => {
  // The button only asks: nothing is removed until the confirmation answers.
  it('draws the button alone, with the confirmation still closed', () => {
    const html = renderToStaticMarkup(<DeleteRecord disabled={false} onConfirm={confirm} />)
    expect(html).toContain('common.delete')
    expect(html).not.toContain('billing.deleteTitle')
    expect(confirm).not.toHaveBeenCalled()
  })

  it('cannot be pressed while a save is travelling', () => {
    expect(renderToStaticMarkup(<DeleteRecord disabled onConfirm={confirm} />)).toContain('disabled')
  })
})
