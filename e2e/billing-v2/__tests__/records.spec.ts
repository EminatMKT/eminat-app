import { test, expect } from '@playwright/test'
import records from '../records'
import session from '../session'
import screen from '../screen'
import { LOCAL_API, RUN } from '../constants'

const FOREIGN_API = 'https://example.supabase.co'

session.install()

test('refuses an API that is not on this machine', () => {
  expect(() => records.assertLocal(FOREIGN_API)).toThrow()
  expect(() => records.assertLocal(LOCAL_API)).not.toThrow()
})

test('a stored record is found by its title and cleared by its id', async ({ request }) => {
  const title = `${RUN} harness`
  await records.insert(request, records.payment(title, screen.day(2)))
  expect(await records.find(request, title)).toHaveLength(1)
  await records.clear(request)
  expect(await records.find(request, title)).toHaveLength(0)
})
