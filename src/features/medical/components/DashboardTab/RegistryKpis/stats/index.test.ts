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

it('picks the accent color at or above an 80 compliance score', () => {
  expect(stats.complianceColor(80)).toBe('var(--c-accent)')
})

it('picks the warn color between 60 and 79', () => {
  expect(stats.complianceColor(60)).toBe('var(--c-warn-solid)')
})

it('picks the danger color under 60', () => {
  expect(stats.complianceColor(59)).toBe('var(--c-danger)')
})
