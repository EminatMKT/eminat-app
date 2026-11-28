import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { LocaleProvider, translate } from '@/shared/i18n'
import { ESTADO, estadoLabel } from '@/shared/constants/domain'
import { NAME_FALLBACK } from '@/features/tasks/hooks/useWorkerReport/constants'
import type { Row } from '@/features/tasks/components/reporte/WorkerReport/types'
import WorkerTableRow from './index'

// The provider starts every render in Spanish, the app's default language.
const SPANISH_LOCALE = 'es'

const BASE_TASK: Row = {
  id: 'task-1',
  titulo: 'Rediseno del sitio web',
  empresa: 'Eminat Research Group',
  estado: ESTADO.EN_PROCESO,
  fecha_inicio: '2026-11-01',
  fecha_entrega: '2026-11-15',
}

const ALTERNATE_DELIVERY_DATE = '2026-12-01'
const UNKNOWN_ESTADO = 'Archivado'
const LEAKING_TASK_ID = 'task-should-not-leak'
const LEAKING_START_DATE = 'SHOULD-NOT-APPEAR'

function withOverrides(overrides: Partial<Row>): Row {
  const merged: Row = { ...BASE_TASK, ...overrides }

  return merged
}

function renderRow(task: Row): string {
  const tree = <LocaleProvider><tbody><WorkerTableRow task={task} /></tbody></LocaleProvider>

  return renderToStaticMarkup(tree)
}

function countMatches(markup: string, pattern: RegExp): number {
  const found = markup.match(pattern)

  return found ? found.length : 0
}

function extractCellTexts(markup: string): string[] {
  const matches = markup.matchAll(/<td[^>]*>([^<]*)<\/td>/g)

  return Array.from(matches, (match) => match[1])
}

function labelFor(estado: string): string {
  return estadoLabel(estado, (key) => translate(SPANISH_LOCALE, key))
}

describe('WorkerTableRow', () => {
  it('renders title, company, translated status and delivery date as the four cells, in order', () => {
    const task = withOverrides({})
    const markup = renderRow(task)
    const statusLabel = labelFor(task.estado)
    const expectedCells = [task.titulo, task.empresa, statusLabel, task.fecha_entrega]

    expect(extractCellTexts(markup)).toEqual(expectedCells)
  })

  it('renders exactly one tr element', () => {
    const markup = renderRow(withOverrides({}))

    expect(countMatches(markup, /<tr/g)).toBe(1)
  })

  it('falls back to NAME_FALLBACK, not the literal null or undefined, when fecha_entrega is null', () => {
    const task = withOverrides({ fecha_entrega: null })
    const markup = renderRow(task)

    expect(extractCellTexts(markup)[3]).toBe(NAME_FALLBACK)
  })

  it('renders the real fecha_entrega value instead of the fallback when one is present', () => {
    const task = withOverrides({ fecha_entrega: ALTERNATE_DELIVERY_DATE })
    const markup = renderRow(task)

    expect(extractCellTexts(markup)[3]).toBe(ALTERNATE_DELIVERY_DATE)
  })

  it('translates ESTADO.EN_PROCESO and ESTADO.POR_APROBAR into two different labels', () => {
    const processingLabel = labelFor(ESTADO.EN_PROCESO)
    const toApproveLabel = labelFor(ESTADO.POR_APROBAR)

    expect(processingLabel).not.toBe(toApproveLabel)

    const markup = renderRow(withOverrides({ estado: ESTADO.EN_PROCESO }))

    expect(extractCellTexts(markup)[2]).toBe(processingLabel)
  })

  it('falls back to the raw estado string when it is outside the known catalog', () => {
    const markup = renderRow(withOverrides({ estado: UNKNOWN_ESTADO }))

    expect(extractCellTexts(markup)[2]).toBe(UNKNOWN_ESTADO)
  })

  it('never leaks fecha_inicio, the task id, or hours/payment text', () => {
    const task = withOverrides({ id: LEAKING_TASK_ID, fecha_inicio: LEAKING_START_DATE })
    const markup = renderRow(task)
    const leakPattern = new RegExp(`${LEAKING_START_DATE}|${LEAKING_TASK_ID}`)

    expect(leakPattern.test(markup)).toBe(false)
    expect(/horas|pago/i.test(markup)).toBe(false)
  })
})
