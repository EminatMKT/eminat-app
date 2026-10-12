import { describe, expect, it } from 'vitest'
import { resolveReportRecipients } from './recipients'

describe('minutes recipient normalization', () => {
  it('deduplicates case/whitespace while keeping all involved candidates', () => {
    expect(resolveReportRecipients([
      { name: 'Invited absent', email: ' ABSENT@example.test ' },
      { name: 'Same person task owner', email: 'absent@EXAMPLE.test' },
      { name: 'Creator', email: 'creator@example.test' },
    ], 'es').recipients).toEqual([
      { name: 'Invited absent', email: 'absent@example.test' },
      { name: 'Creator', email: 'creator@example.test' },
    ])
  })
  it('reports missing or invalid addresses explicitly; never guesses them from names', () => {
    const result = resolveReportRecipients([
      { name: 'External', email: null }, { name: 'Whitespace', email: '  ' },
      { name: 'Invalid', email: 'bad@' },
    ], 'en')
    expect(result.recipients).toEqual([])
    expect(result.omitted).toEqual([
      { name: 'External', reason: 'No email available' },
      { name: 'Whitespace', reason: 'No email available' },
      { name: 'Invalid', reason: 'Invalid email' },
    ])
  })
})
