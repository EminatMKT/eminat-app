import { test, expect } from '@playwright/test'
import rowIds from '../row-ids'

const answer = (body: unknown) => ({ json: async () => body })

test('reads the ids of the rows PostgREST answered with', async () => {
  expect(await rowIds(answer([{ id: 'a' }, { id: 'b' }]))).toEqual(['a', 'b'])
  expect(await rowIds(answer([]))).toEqual([])
})

// An error body is not a list of rows: it fails here, not as an empty cleanup later.
test('refuses a body that is not rows with an id', async () => {
  await expect(rowIds(answer({ message: 'denied' }))).rejects.toThrow()
  await expect(rowIds(answer([{ name: 'x' }]))).rejects.toThrow()
})
