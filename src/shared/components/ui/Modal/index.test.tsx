import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { DIALOG } from '@/shared/constants/dom'
import Modal from './index'

vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: string) => key }) }))

// Fixtures, not shipped copy: callers hand Modal text their own locale already produced.
const TITLE = 'New record'
const QUESTION = 'Delete it?'
const NAME = 'Launch plan'
const BODY = 'body'
const ignore = () => undefined
const attribute = (html: string, name: string) => html.match(new RegExp(`${name}="([^"]*)"`))?.[1]
const titled = () => renderToStaticMarkup(<Modal title={TITLE} onClose={ignore}>{BODY}</Modal>)

describe('Modal', () => {
  it('says it is a modal dialog to assistive technology', () => {
    const html = titled()
    expect(html).toContain(`role="${DIALOG}"`)
    expect(html).toContain('aria-modal="true"')
  })

  it('is named by its visible title', () => {
    const html = titled()
    const titleId = attribute(html, 'aria-labelledby')
    expect(titleId).toBeTruthy()
    expect(html).toMatch(new RegExp(`id="${titleId}"[^>]*>${TITLE}<`))
  })

  // With nothing focusable inside, the box itself has to be able to hold the focus.
  it('can take the focus itself', () => {
    expect(titled()).toContain('tabindex="-1"')
  })

  it('interrupts with alertdialog when it asks for a decision', () => {
    const html = renderToStaticMarkup(<Modal title={QUESTION} role="alertdialog" onClose={ignore}>{BODY}</Modal>)
    expect(html).toContain('role="alertdialog"')
  })

  // A caller that draws its own header has no title element to point at, so it names the box.
  it('takes its name from the caller when the header is the caller’s own', () => {
    const html = renderToStaticMarkup(<Modal header={BODY} label={NAME} onClose={ignore}>{BODY}</Modal>)
    expect(html).toContain(`aria-label="${NAME}"`)
    expect(html).not.toContain('aria-labelledby')
  })
})
