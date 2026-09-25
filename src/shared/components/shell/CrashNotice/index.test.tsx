import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { RELOAD, SHOW, DECIDING } from '@/shared/utils'
import CrashNotice from './index'

const recovery = vi.hoisted(() => ({ step: 'deciding' }))
vi.mock('@/shared/hooks', () => ({ useCrashRecovery: () => recovery.step }))
vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: string) => key }) }))

const TITLE = 'shell.crashTitle'
const RELOAD_LABEL = 'shell.crashReload'
const SPINNER = 'shell.loading'
const draw = () => renderToStaticMarkup(<CrashNotice error={new Error(TITLE)} />)

beforeEach(() => { recovery.step = DECIDING })

describe('CrashNotice', () => {
  // Nothing is shown before it is known whether the page is about to reload by itself.
  it('keeps the spinner while it decides', () => {
    expect(draw()).toContain(SPINNER)
    expect(draw()).not.toContain(TITLE)
  })

  // A reload is on its way: a flash of "something went wrong" would be a lie.
  it('keeps the spinner while the page reloads', () => {
    recovery.step = RELOAD
    expect(draw()).not.toContain(TITLE)
  })

  it('says what happened and offers to reload when it will not reload by itself', () => {
    recovery.step = SHOW
    const html = draw()
    expect(html).toContain(TITLE)
    expect(html).toContain(RELOAD_LABEL)
    expect(html).not.toContain(SPINNER)
  })
})
