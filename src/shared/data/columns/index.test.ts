import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import TABLE_COLUMNS from '.'

const UTF8 = 'utf8'
const NEWLINE = '\n'
const MIGRATIONS_DIR = join(process.cwd(), 'supabase', 'migrations')
const allMigrations = readdirSync(MIGRATIONS_DIR)
  .map(file => readFileSync(join(MIGRATIONS_DIR, file), UTF8))
  .join(NEWLINE)
const columnNames = Object.values(TABLE_COLUMNS).flatMap(columns => Object.values(columns))

// A misspelled column fails only at runtime as an empty filter; this pins every name to the schema.
describe('TABLE_COLUMNS', () => {
  it.each(columnNames)('%s appears in a migration', name => {
    const asWord = new RegExp(`\\b${name}\\b`)
    expect(allMigrations).toMatch(asWord)
  })
})
