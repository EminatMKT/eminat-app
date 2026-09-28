import { describe, expect, it } from 'vitest'
import fakeClient from './index'

const FIRST = { data: [{ id: 'a' }], error: null }
const SECOND = { data: [{ id: 'b' }], error: null }
const EMPTY = { data: [], error: null }

describe('fake supabase client', () => {
  it('answers the queued replies in order, then empty pages', async () => {
    const client = fakeClient([FIRST, SECOND])
    expect(await client.from('t').select()).toBe(FIRST)
    expect(await client.from('t').select()).toBe(SECOND)
    expect(await client.from('t').select()).toEqual(EMPTY)
  })

  it('records the chain it was asked for and the payload it was given', async () => {
    const client = fakeClient([FIRST])
    await client.from('billing').update({ title: 'x' }).eq('id', 'abc').single()
    expect(client.calls).toEqual(['from:billing', 'update', 'eq:id:abc', 'single'])
    expect(client.sent).toEqual([{ title: 'x' }])
  })
})
