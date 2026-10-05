import { test, expect } from '@playwright/test'
import { NUEVO_EMAIL } from '../constants'
import emailsWhere from './index'

// global-setup always leaves this user in place; nobody ever creates the second one.
const SEEDED = NUEVO_EMAIL
const MISSING = 'nobody.e2e@eminat.net'
const BY_SEEDED = `email=eq.${SEEDED}`
const BY_MISSING = `email=eq.${MISSING}`

test('emailsWhere returns the email of every row the filter matches', async () => {
  expect(await emailsWhere(BY_SEEDED)).toEqual([SEEDED])
})

test('emailsWhere returns an empty list when nothing matches', async () => {
  expect(await emailsWhere(BY_MISSING)).toEqual([])
})
