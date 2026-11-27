import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import type {
  Row,
  PrintContext,
} from '@/features/tasks/components/reporte/WorkerReport/types'

const { fakes, printModulePath } = vi.hoisted(() => ({
  fakes: { printWorkerReport: vi.fn() },
  printModulePath: '@/features/tasks/components/reporte/WorkerReport/print',
}))

vi.mock(printModulePath, () => ({ default: fakes.printWorkerReport }))

import printWorkerTasks from '.'

const translate = (key: string): string => key
const NO_OVERRIDES: Partial<Row> = {}

const row = (overrides: Partial<Row> = NO_OVERRIDES): Row => ({
  id: 'r1',
  titulo: 'Post',
  empresa: 'EMC',
  estado: 'completado',
  fecha_inicio: '2026-08-17',
  fecha_entrega: null,
  ...overrides,
})

const ctx: PrintContext = { mes: '2026-08', intlLocale: 'es-EC', t: translate }

beforeEach(() => {
  fakes.printWorkerReport.mockClear()
})

describe('printWorkerTasks', () => {
  it('returns without printing when the signed-in user is null', () => {
    const tasks = [row()]

    printWorkerTasks(tasks, null, ctx)

    expect(fakes.printWorkerReport).not.toHaveBeenCalled()
  })

  it('returns without printing when the signed-in user is undefined', () => {
    const tasks = [row()]

    printWorkerTasks(tasks, undefined, ctx)

    expect(fakes.printWorkerReport).not.toHaveBeenCalled()
  })

  it('returns without printing when the user id is falsy (empty string)', () => {
    const tasks = [row()]
    const userWithoutId = { id: '', nombre: 'Ada' }

    printWorkerTasks(tasks, userWithoutId, ctx)

    expect(fakes.printWorkerReport).not.toHaveBeenCalled()
  })

  it('prints with the em-dash fallback when the user has no nombre field', () => {
    const tasks = [row()]
    const userWithoutName = { id: 'u1' }

    printWorkerTasks(tasks, userWithoutName, ctx)

    const expectedAuthor = { id: 'u1', nombre: '—' }

    expect(fakes.printWorkerReport).toHaveBeenCalledTimes(1)
    expect(fakes.printWorkerReport).toHaveBeenCalledWith(tasks, expectedAuthor, ctx)
  })

  it('prints with the em-dash fallback when the user nombre is an empty string', () => {
    const tasks = [row()]
    const userWithEmptyName = { id: 'u1', nombre: '' }

    printWorkerTasks(tasks, userWithEmptyName, ctx)

    const expectedAuthor = { id: 'u1', nombre: '—' }

    expect(fakes.printWorkerReport).toHaveBeenCalledWith(tasks, expectedAuthor, ctx)
  })

  it('passes tasks and ctx straight through, and the real nombre when present', () => {
    const firstOverrides = { id: 'r1' }
    const secondOverrides = { id: 'r2', titulo: 'Segunda' }
    const tasks = [row(firstOverrides), row(secondOverrides)]
    const user = { id: 'u1', nombre: 'Ada' }

    printWorkerTasks(tasks, user, ctx)

    expect(fakes.printWorkerReport).toHaveBeenCalledTimes(1)
    expect(fakes.printWorkerReport).toHaveBeenCalledWith(tasks, user, ctx)
  })
})
