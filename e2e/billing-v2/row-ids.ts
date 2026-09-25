import type { IdRow } from './types'

/** The part of a Playwright response this reads. */
type JsonAnswer = { json: () => Promise<unknown> }

const isIdRows = (body: unknown): body is IdRow[] =>
  Array.isArray(body) && body.every((row) => typeof row?.id === 'string')

/** The ids of the rows a PostgREST answer carries, checked instead of cast. */
export default async function rowIds(answer: JsonAnswer): Promise<string[]> {
  const body: unknown = await answer.json()
  if (!isIdRows(body)) throw new Error('billing e2e expected rows that carry an id')
  const ids = body.map(({ id }) => id)
  return ids
}

// An error body —a refused write, an expired token— is an object, not a list: it fails here with
// a clear message instead of reaching the cleanup as an empty list of ids to delete.
