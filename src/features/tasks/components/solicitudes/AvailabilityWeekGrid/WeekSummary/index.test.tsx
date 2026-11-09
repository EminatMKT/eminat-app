import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import type { GridSummary } from '../controller/types'
import WeekSummary from './index'

const SUMMARY: GridSummary = {
  total: 'week total copy',
  empty: 'empty week copy',
  noJornada: 'no jornada copy',
}
const ASSIGNED_SUMMARY: GridSummary = { ...SUMMARY, noJornada: null }

it('shows the declared total next to the no-jornada notice', () => {
  const html = renderToStaticMarkup(<WeekSummary summary={SUMMARY} />)

  expect(html).toContain(SUMMARY.total)
  expect(html).toContain(SUMMARY.noJornada)
})

it('shows only the declared total while a workday is assigned', () => {
  const html = renderToStaticMarkup(<WeekSummary summary={ASSIGNED_SUMMARY} />)

  expect(html).toContain(SUMMARY.total)
  expect(html).not.toContain(SUMMARY.noJornada)
})
