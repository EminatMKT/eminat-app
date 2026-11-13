import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { ONLINE_WINDOW_MS } from '@/shared/constants/domain'
import type { Presence, RosterUser } from '../types'
import presenceOf from './index'

const MEMBER_ID = 'roster-member-7'
const AUTH_ID = 'roster-auth-7'
const ONE_MINUTE_MS = 60 * 1000
const FROZEN_AT = '2026-11-10T09:15:00'
const frozenInstant = new Date(FROZEN_AT)

const heartbeatAgo = (milliseconds: number) =>
  new Date(frozenInstant.getTime() - milliseconds).toISOString()

const recentHeartbeat = heartbeatAgo(ONE_MINUTE_MS)
const staleHeartbeat = heartbeatAgo(ONLINE_WINDOW_MS + ONE_MINUTE_MS)

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(frozenInstant)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('presenceOf without an auth account', () => {
  it('marks the member as unregistered even with a recent heartbeat', () => {
    const member: RosterUser = { id: MEMBER_ID, online_at: recentHeartbeat }
    const expected: Presence = { hasAccount: false, isOnline: true, status: 'unregistered' }

    expect(presenceOf(member)).toEqual(expected)
  })
})

describe('presenceOf with a heartbeat inside the window', () => {
  it('marks the member as online', () => {
    const member: RosterUser = { id: MEMBER_ID, auth_id: AUTH_ID, online_at: recentHeartbeat }
    const expected: Presence = { hasAccount: true, isOnline: true, status: 'online' }

    expect(presenceOf(member)).toEqual(expected)
  })
})

const offline: Presence = { hasAccount: true, isOnline: false, status: 'offline' }

describe('presenceOf with a stale heartbeat', () => {
  it('marks the member as offline', () => {
    const stale: RosterUser = { id: MEMBER_ID, auth_id: AUTH_ID, online_at: staleHeartbeat }

    expect(presenceOf(stale)).toEqual(offline)
  })
})

describe('presenceOf without any heartbeat', () => {
  it('marks the member as offline', () => {
    const silent: RosterUser = { id: MEMBER_ID, auth_id: AUTH_ID }

    expect(presenceOf(silent)).toEqual(offline)
  })
})
