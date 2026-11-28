import { describe, expect, it } from 'vitest'
import { ESTADO, ESTADO_COLORS } from '@/shared/constants/domain'
import { DEFAULT_ESTADO_COLOR } from '@/features/tasks/utils/report-html/table-rows/constants'
import statusCell from './index'

const KNOWN_STATUS = ESTADO.COMPLETADO
const KNOWN_COLOR = ESTADO_COLORS[KNOWN_STATUS]
const HOSTILE_STATUS = '<b>Odd</b>'
const ESCAPED_HOSTILE_STATUS = '&lt;b&gt;Odd&lt;/b&gt;'

describe('statusCell', () => {
  it('renders the color mapped to a known status', () => {
    const html = statusCell(KNOWN_STATUS)

    expect(html).toContain(KNOWN_COLOR)
    expect(html).toContain(KNOWN_STATUS)
  })

  it('falls back to the default color when the status is undefined', () => {
    expect(statusCell(undefined)).toContain(DEFAULT_ESTADO_COLOR)
  })

  it('falls back to the default color when the status is unknown to the catalog', () => {
    expect(statusCell(HOSTILE_STATUS)).toContain(DEFAULT_ESTADO_COLOR)
  })

  it('escapes a hostile status label instead of rendering it as markup', () => {
    const html = statusCell(HOSTILE_STATUS)

    expect(html).toContain(ESCAPED_HOSTILE_STATUS)
    expect(html).not.toContain(HOSTILE_STATUS)
  })
})
