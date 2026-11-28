import { describe, expect, it } from 'vitest'
import type { Actividad } from '@/features/tasks/types'
import { EMPTY_VALUE } from '@/features/tasks/utils/report-html/table-rows/constants'
import companyCell from './index'

const TASK: Actividad = { empresa: 'H<MC' }
const NO_COMPANY: Actividad = {}
const ESCAPED_COMPANY = 'H&lt;MC'
const CELL_CONTENT_PATTERN = /<td[^>]*>([^<]*)<\/td>/

describe('companyCell', () => {
  it('escapes the company name', () => {
    expect(companyCell(TASK)).toContain(ESCAPED_COMPANY)
  })

  it('falls back to the empty value when the company is absent', () => {
    const html = companyCell(NO_COMPANY)
    const content = html.match(CELL_CONTENT_PATTERN)?.[1]

    expect(content).toBe(EMPTY_VALUE)
  })
})
