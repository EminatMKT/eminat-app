import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { NO_ACCOUNT_KEY } from '../constants'
import type { Presence } from '../types'
import RosterMail from './index'

const { i18nModulePath } = vi.hoisted(() => ({ i18nModulePath: '@/shared/i18n' }))

vi.mock(i18nModulePath, () => ({ useT: () => ({ t: (key: string) => key }) }))

const MEMBER_EMAIL = 'leonor@emc.health'

const signedUp: Presence = { hasAccount: true, isOnline: false, status: 'offline' }
const neverSignedUp: Presence = { hasAccount: false, isOnline: false, status: 'unregistered' }

const mailLineOf = (presence: Presence) =>
  renderToStaticMarkup(<RosterMail email={MEMBER_EMAIL} presence={presence} />)

describe('RosterMail', () => {
  it('prints the email only for a member with an account', () => {
    expect(mailLineOf(signedUp)).toContain(MEMBER_EMAIL)
    expect(mailLineOf(neverSignedUp)).not.toContain(MEMBER_EMAIL)
  })

  it('says there is no account yet for a member without one', () => {
    expect(mailLineOf(neverSignedUp)).toContain(NO_ACCOUNT_KEY)
  })
})
