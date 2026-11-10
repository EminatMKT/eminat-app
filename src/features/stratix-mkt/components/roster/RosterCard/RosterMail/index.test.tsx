import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { LocaleProvider, translate } from '@/shared/i18n'
import { MISSING_EMAIL, NO_ACCOUNT_KEY } from '../constants'
import type { Presence } from '../types'
import s from '../index.module.css'
import RosterMail from './index'

// The provider starts every render in Spanish, the app's default language.
const SPANISH = 'es'
const MEMBER_EMAIL = 'leonor@emc.health'
const MAIL_PREFIX = '✉ '
const NO_ACCOUNT_PREFIX = '✉ — '
const UNDEFINED_TEXT = String(undefined)

const noAccountCopy = translate(SPANISH, NO_ACCOUNT_KEY)

const signedUpOffline: Presence = { hasAccount: true, isOnline: false, status: 'offline' }
const signedUpOnline: Presence = { hasAccount: true, isOnline: true, status: 'online' }
const neverSignedUp: Presence = { hasAccount: false, isOnline: false, status: 'unregistered' }
const staleOnline: Presence = { hasAccount: false, isOnline: true, status: 'unregistered' }

const mailLineOf = (presence: Presence, email?: string) =>
  renderToStaticMarkup(
    <LocaleProvider>
      <RosterMail email={email} presence={presence} />
    </LocaleProvider>,
  )

// What the line must be: one div carrying the card's mail class around exactly this text.
const lineReading = (text: string) => renderToStaticMarkup(<div className={s.mail}>{text}</div>)

const noAccountLine = lineReading(`${NO_ACCOUNT_PREFIX}${noAccountCopy}`)

describe('RosterMail for a member with an account', () => {
  it('renders one mail-classed div holding the envelope and the email', () => {
    const expected = lineReading(`${MAIL_PREFIX}${MEMBER_EMAIL}`)

    expect(mailLineOf(signedUpOffline, MEMBER_EMAIL)).toBe(expected)
  })

  it('prints the same line whether the member is online or offline', () => {
    const offlineLine = mailLineOf(signedUpOffline, MEMBER_EMAIL)

    expect(mailLineOf(signedUpOnline, MEMBER_EMAIL)).toBe(offlineLine)
  })

  it('reads the envelope and a dash, never undefined, when the email is missing', () => {
    const line = mailLineOf(signedUpOffline)
    const expected = lineReading(`${MAIL_PREFIX}${MISSING_EMAIL}`)

    expect(line).toBe(expected)
    expect(line).not.toContain(UNDEFINED_TEXT)
  })
})

describe('RosterMail for a member without an account', () => {
  it('reads the translated no-account copy behind the envelope and a dash', () => {
    expect(mailLineOf(neverSignedUp)).toBe(noAccountLine)
  })

  it('hides a known email and reads only the no-account copy', () => {
    const line = mailLineOf(neverSignedUp, MEMBER_EMAIL)

    expect(line).toBe(noAccountLine)
    expect(line).not.toContain(MEMBER_EMAIL)
  })

  it('decides on the account alone, not on a stale online flag', () => {
    expect(mailLineOf(staleOnline, MEMBER_EMAIL)).toBe(noAccountLine)
  })

  it('shows real copy, not the bare translation key', () => {
    expect(mailLineOf(neverSignedUp)).not.toContain(NO_ACCOUNT_KEY)
  })
})
