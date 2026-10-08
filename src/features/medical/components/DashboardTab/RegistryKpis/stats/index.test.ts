import { expect, it } from 'vitest'
import stats from '.'

const t = (key: string) => key
const counts = { totalPatients: 500, withEmail: 300, withoutEmail: 200 }

it('shows a dash for every registry stat while counts have not resolved yet', () => {
  const rows = stats.registryStats(null, t)
  expect(rows.map((row) => row.value)).toEqual(['—', '—', '—', '—'])
})

it('shows the real registry numbers once counts resolve', () => {
  const rows = stats.registryStats(counts, t)
  expect(rows[0].value).toBe(500)
  expect(rows[1].value).toBe(300)
})
