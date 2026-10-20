import { expect, it } from 'vitest'
import { serializeLeadsPage } from './lead-export'

it('exports only supplied scoped rows and neutralizes spreadsheet formulas', () => {
  const csv = serializeLeadsPage([{ id: 'qa-lead', display_name: '=HYPERLINK("https://bad.example")',
    source: '+SUM(1,2)', email: 'qa@example.test', status: 'NEW' }],
  () => 'QA Seller', () => 'Sales')
  expect(csv).toContain('"\'=HYPERLINK(""https://bad.example"")"')
  expect(csv).toContain('"\'+SUM(1,2)"')
  expect(csv.split('\r\n')).toHaveLength(2)
})
