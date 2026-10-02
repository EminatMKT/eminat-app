import { expect, it } from 'vitest'
import * as schema from '.'

it('offers the schema name catalogs, and nothing that opens a Supabase client', () => {
  expect(Object.keys(schema).sort()).toEqual(['COLUMNS', 'RPCS', 'TABLES', 'TABLE_COLUMNS'])
})
