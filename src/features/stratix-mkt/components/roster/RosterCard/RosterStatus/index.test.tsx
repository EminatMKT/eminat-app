import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  ACCOUNT_PENDING_KEY,
  ACTIVE_NOW_KEY,
  OFFLINE_KEY,
} from '../constants'
import type { Presence } from '../types'
import RosterStatus from './index'

const { i18nModulePath } = vi.hoisted(() => ({ i18nModulePath: '@/shared/i18n' }))

vi.mock(i18nModulePath, () => ({ useT: () => ({ t: (key: string) => key }) }))

const ONLINE_DOT = '● '

const statusOf = (presence: Presence) => renderToStaticMarkup(<RosterStatus presence={presence} />)

describe('RosterStatus for a member with an account', () => {
  it('reads active now behind a dot when online, offline otherwise', () => {
    const online: Presence = { hasAccount: true, isOnline: true, status: 'online' }
    const offline: Presence = { hasAccount: true, isOnline: false, status: 'offline' }

    expect(statusOf(online)).toContain(`${ONLINE_DOT}${ACTIVE_NOW_KEY}`)
    expect(statusOf(offline)).toContain(OFFLINE_KEY)
  })
})

describe('RosterStatus for a member without an account', () => {
  it('shows the account notice instead of a status', () => {
    const unregistered: Presence = { hasAccount: false, isOnline: true, status: 'unregistered' }

    expect(statusOf(unregistered)).toContain(ACCOUNT_PENDING_KEY)
  })
})
