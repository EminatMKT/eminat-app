import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { RosterUser } from '../types'
import RosterIdentity from './index'

const MEMBER_ID = 'roster-member-6'
const FIRST_NAME = 'Leonor'
const LAST_NAME = 'Basantes'
const EXPECTED_FULL_NAME = '>Leonor Basantes<'
const EXPECTED_INITIALS = '>LB<'
const EXPECTED_FIRST_ONLY = '>Leonor<'

describe('RosterIdentity with a full name', () => {
  it('draws the initials avatar beside the full name', () => {
    const member: RosterUser = { id: MEMBER_ID, nombre: FIRST_NAME, apellido: LAST_NAME }
    const html = renderToStaticMarkup(<RosterIdentity user={member} status="online" />)

    expect(html).toContain(EXPECTED_INITIALS)
    expect(html).toContain(EXPECTED_FULL_NAME)
  })
})

describe('RosterIdentity without a last name', () => {
  it('trims the missing part away', () => {
    const member: RosterUser = { id: MEMBER_ID, nombre: FIRST_NAME }
    const html = renderToStaticMarkup(<RosterIdentity user={member} status="offline" />)

    expect(html).toContain(EXPECTED_FIRST_ONLY)
  })
})
