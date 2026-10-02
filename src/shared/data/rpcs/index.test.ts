import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import RPCS from '.'

const MIGRATIONS_DIR = join(process.cwd(), 'supabase', 'migrations')
const allMigrations = readdirSync(MIGRATIONS_DIR)
  .map(file => readFileSync(join(MIGRATIONS_DIR, file), 'utf8'))
  .join('\n')

// A renamed or misspelled RPC fails only at runtime in the browser; this pins it to the schema.
describe('RPCS', () => {
  it.each(Object.values(RPCS))('%s is defined by a migration', name => {
    expect(allMigrations).toMatch(new RegExp(`FUNCTION\\s+"?public"?\\."?${name}"?\\s*\\(`, 'i'))
  })
})
