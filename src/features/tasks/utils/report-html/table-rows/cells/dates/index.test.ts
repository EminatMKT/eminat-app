import { describe, expect, it } from 'vitest'
import type { Actividad } from '@/features/tasks/types'
import { DATE_FALLBACK } from '@/features/tasks/utils/report-html/table-rows/constants'
import dateCells from './index'

const START_DATE = '2027-01-10'
const END_DATE = '2027-01-11'
const BOTH_DATES: Actividad = { fecha_inicio: START_DATE, fecha_entrega: END_DATE }
const NO_DATES: Actividad = {}
const ONLY_START_DATE: Actividad = { fecha_inicio: START_DATE }

describe('dateCells', () => {
  it('renders both dates when present', () => {
    const html = dateCells(BOTH_DATES)

    expect(html).toContain(START_DATE)
    expect(html).toContain(END_DATE)
  })

  it('falls back to the dash for both missing dates', () => {
    const html = dateCells(NO_DATES)
    const fallbackCount = html.split(DATE_FALLBACK).length - 1

    expect(fallbackCount).toBe(2)
  })

  it('falls back only the missing one when a single date is present', () => {
    const html = dateCells(ONLY_START_DATE)
    const fallbackCount = html.split(DATE_FALLBACK).length - 1

    expect(html).toContain(START_DATE)
    expect(fallbackCount).toBe(1)
  })
})
