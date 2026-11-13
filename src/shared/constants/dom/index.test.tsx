import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import Pressable from '@/shared/components/ui/Pressable'
import {
  BANNER,
  HEADER_ELEMENT,
  MAIN_ELEMENT,
  BUTTON,
  DIALOG,
  ALERT_DIALOG,
  OPTION,
  ENTER,
  ESCAPE,
  TAB,
} from './index'

const ignore = () => undefined
const LABEL = 'Day 30'

describe('dom names', () => {
  // A suite that counts the calendar's controls by BUTTON has to be counting what they draw.
  it('names the element a pressable surface draws', () => {
    const html = renderToStaticMarkup(<Pressable accessibleLabel={LABEL} onClick={ignore}>30</Pressable>)
    expect(html.startsWith(`<${BUTTON} `)).toBe(true)
  })

  // The e2e finds an open editor by this role; the Modal's own suite pins that it declares it.
  it('names the role a modal declares, spelled as ARIA spells it', () => {
    expect(DIALOG).toBe('dialog')
  })

  // The e2e finds the shell's topbar by this role; the Topbar's own suite pins that it has it.
  it('names the role of the page-wide header, spelled as ARIA spells it', () => {
    expect(BANNER).toBe('banner')
    expect(HEADER_ELEMENT).toBe('header')
    expect(MAIN_ELEMENT).toBe('main')
  })

  // The keys a dialog and a menu answer, spelled as `KeyboardEvent.key` spells them.
  // A typo here compiles and then never matches a key, so the spelling is pinned.
  it('names the keys that confirm, close and move the focus', () => {
    expect([ENTER, ESCAPE, TAB]).toEqual(['Enter', 'Escape', 'Tab'])
  })

  // The e2e finds a delete confirmation by this role; the Modal's own suite pins that it
  // declares it, instead of DIALOG, when rendered as a confirm/alert dialog. The
  // multi-responsibles e2e finds each choice of a select by this role.
  it('names the role a confirm dialog declares and the role of a select\'s own choices', () => {
    expect([ALERT_DIALOG, OPTION]).toEqual(['alertdialog', 'option'])
  })
})
