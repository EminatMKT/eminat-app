import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import type { Usuario } from '@/shared/context/loadAppData'
import type { FetchState, Translate } from './types'
import { localMonth } from '@/shared/utils'
import row from './test-fixtures/row'
import { SIGNED_IN_USER, SPANISH_LOCALE, ENGLISH_LOCALE } from './test-fixtures/constants'

// No DOM in this suite: calling the hook as a plain function, like the sibling tests do.
// useFetchState/printWorkerTasks are already-tested units, mocked out so this file only
// exercises how the outer hook composes them (month state, wiring, print ctx building).
const { fakes, fetchStatePath, printTasksPath, reactPath } = vi.hoisted(() => ({
  fakes: { setMonth: vi.fn(), useFetchState: vi.fn(), printWorkerTasks: vi.fn() },
  fetchStatePath: './use-fetch-state',
  printTasksPath: './print-tasks',
  reactPath: 'react',
}))

function isLazyInitializer(value: unknown): value is () => string {
  return typeof value === 'function'
}

function fakeUseState(initial: unknown): [unknown, typeof fakes.setMonth] {
  const month = isLazyInitializer(initial) ? initial() : initial

  return [month, fakes.setMonth]
}

vi.mock(reactPath, async importOriginal => {
  const actual = await importOriginal<typeof import('react')>()

  return { ...actual, useState: fakeUseState }
})

vi.mock(fetchStatePath, () => ({ default: fakes.useFetchState }))
vi.mock(printTasksPath, () => ({ default: fakes.printWorkerTasks }))

import useWorkerReport from '.'

const translate: Translate = key => key
const otherTranslate: Translate = key => `other:${key}`
const intlLocale = SPANISH_LOCALE
const otherLocale = ENGLISH_LOCALE
const signedInUser: Usuario = SIGNED_IN_USER
const FIXED_NOW_ISO = '2026-11-27T12:00:00'

type RenderOpts = { report: FetchState; locale?: string; t?: Translate }

function renderReport(usuario: Usuario | null, opts: RenderOpts) {
  fakes.useFetchState.mockReturnValueOnce(opts.report)
  const locale = opts.locale ?? intlLocale
  const t = opts.t ?? translate

  return useWorkerReport(usuario, locale, t)
}

function callPrint(result: { handlePrint: () => void }) {
  result.handlePrint()

  return fakes.printWorkerTasks.mock.calls[0]
}

function expectedCtx(month: string, locale: string, t: Translate) {
  return { mes: month, intlLocale: locale, t }
}

beforeEach(() => {
  fakes.setMonth.mockClear()
  fakes.useFetchState.mockReset()
  fakes.printWorkerTasks.mockClear()
  vi.useFakeTimers()
  vi.setSystemTime(new Date(FIXED_NOW_ISO))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useWorkerReport', () => {
  it('calls useFetchState once with the user id and the initial month', () => {
    const report: FetchState = { tasks: [row()], error: '' }
    const result = renderReport(signedInUser, { report })

    expect(fakes.useFetchState).toHaveBeenCalledTimes(1)
    expect(fakes.useFetchState).toHaveBeenCalledWith(signedInUser.id, result.period.month)
  })

  it('initializes period.month from localMonth and wires setMonth straight through', () => {
    const report: FetchState = { tasks: [], error: '' }
    const result = renderReport(signedInUser, { report })

    expect(result.period.month).toBe(localMonth())
    expect(result.period.setMonth).toBe(fakes.setMonth)
  })

  it('returns the report from useFetchState untouched, same reference', () => {
    const report: FetchState = { tasks: [row()], error: '' }
    const result = renderReport(signedInUser, { report })

    expect(result.report).toBe(report)
  })

  it('calls useFetchState with undefined, not null, when there is no signed-in user', () => {
    const result = renderReport(null, { report: { tasks: [], error: '' } })
    const expectedUserId = undefined

    expect(fakes.useFetchState).toHaveBeenCalledWith(expectedUserId, result.period.month)
  })

  it('calls printWorkerTasks once with the report tasks and the user, by reference', () => {
    const rows = [row()]
    const result = renderReport(signedInUser, { report: { tasks: rows, error: '' } })
    const [calledTasks, calledUser] = callPrint(result)

    expect(fakes.printWorkerTasks).toHaveBeenCalledTimes(1)
    expect(calledTasks).toBe(rows)
    expect(calledUser).toBe(signedInUser)
  })

  it('builds the print ctx from the current month, intlLocale, and t', () => {
    const result = renderReport(signedInUser, { report: { tasks: [row()], error: '' } })
    const [, , calledCtx] = callPrint(result)
    const ctx = expectedCtx(result.period.month, intlLocale, translate)

    expect(calledCtx).toEqual(ctx)
  })

  it('calls printWorkerTasks again, once per call, on repeated handlePrint calls', () => {
    const result = renderReport(signedInUser, { report: { tasks: [row()], error: '' } })

    result.handlePrint()
    result.handlePrint()
    expect(fakes.printWorkerTasks).toHaveBeenCalledTimes(2)
  })

  it('still calls printWorkerTasks on handlePrint with a null usuario', () => {
    const result = renderReport(null, { report: { tasks: [row()], error: '' } })
    const [, calledUser] = callPrint(result)

    expect(fakes.printWorkerTasks).toHaveBeenCalledTimes(1)
    expect(calledUser).toBe(null)
  })

  it('builds the ctx from the given intlLocale and t, not the defaults', () => {
    const report: FetchState = { tasks: [row()], error: '' }
    const opts = { report, locale: otherLocale, t: otherTranslate }
    const result = renderReport(signedInUser, opts)
    const [, , calledCtx] = callPrint(result)
    const ctx = expectedCtx(result.period.month, otherLocale, otherTranslate)

    expect(calledCtx).toEqual(ctx)
  })
})
