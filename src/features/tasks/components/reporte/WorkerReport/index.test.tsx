import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { ESTADO, ALERT } from '@/shared/constants'
import { LoadingView } from '@/shared/components/ui'
import WorkerTableRow from '../WorkerTableRow'
import type { FetchState } from '@/features/tasks/hooks/useWorkerReport/types'
import type { Row } from './types'

// No DOM here: WorkerReport is called directly, like RecordButton's own test does, and its
// returned tree is read via plain property access — Button, LoadingView and WorkerTableRow
// are referenced only as `.type`, never invoked.
const { fakes, appContextPath, i18nPath, workerReportPath } = vi.hoisted(() => ({
  fakes: {
    useApp: vi.fn(),
    useT: vi.fn(),
    useWorkerReport: vi.fn(),
    setMonth: vi.fn(),
    handlePrint: vi.fn(),
  },
  appContextPath: '@/shared/context/AppContext',
  i18nPath: '@/shared/i18n',
  workerReportPath: '@/features/tasks/hooks/useWorkerReport',
}))

vi.mock(appContextPath, () => ({ useApp: fakes.useApp }))
vi.mock(i18nPath, () => ({ useT: fakes.useT }))
vi.mock(workerReportPath, () => ({ default: fakes.useWorkerReport }))

import WorkerReport from '.'

type Tree = ReturnType<typeof WorkerReport>

const DIV_TAG = 'div'
const MONTH = '2026-11'
const NEW_MONTH = '2026-12'
const NO_ERROR = ''
const ERROR_TEXT = 'Could not load tasks'
const EMPTY_MESSAGE_KEY = 'stratix.report.empty'
const INTL_LOCALE = 'es-EC'
const EMPTY_TASKS: Row[] = []
const NO_PROPS = {}

const translate = (key: string) => key
const USE_APP_RESULT = { usuario: null }
const USE_T_RESULT = { t: translate, intlLocale: INTL_LOCALE }

const BASE_TASK: Row = {
  id: 'task-1',
  titulo: 'Draft the November newsletter',
  empresa: 'EMC',
  estado: ESTADO.EN_PROCESO,
  fecha_inicio: '2026-11-01',
  fecha_entrega: '2026-11-15',
}
const TASK_PENDING: Row = { ...BASE_TASK, id: 'task-pending', estado: ESTADO.PENDIENTE }
const TASK_DONE: Row = { ...BASE_TASK, id: 'task-done-1', estado: ESTADO.COMPLETADO }
const TASK_DONE_B: Row = { ...BASE_TASK, id: 'task-done-2', estado: ESTADO.COMPLETADO }

function loadingReport() {
  const report = { tasks: EMPTY_TASKS, error: NO_ERROR, loading: true }

  return report
}

function settledReport(tasks: Row[], error: string) {
  const report = { tasks, error, loading: false }

  return report
}

function setup(report: FetchState) {
  const period = { month: MONTH, setMonth: fakes.setMonth }
  const result = { period, report, handlePrint: fakes.handlePrint }

  fakes.useApp.mockReturnValue(USE_APP_RESULT)
  fakes.useT.mockReturnValue(USE_T_RESULT)
  fakes.useWorkerReport.mockReturnValue(result)

  return WorkerReport()
}

function controlsDiv(tree: Tree) {
  return tree.props.children[0]
}

function hojaDiv(tree: Tree) {
  return tree.props.children[1]
}

function periodLabel(tree: Tree) {
  return controlsDiv(tree).props.children
}

function monthInput(tree: Tree) {
  return periodLabel(tree).props.children[2]
}

function headDiv(tree: Tree) {
  return hojaDiv(tree).props.children[0]
}

function printButton(tree: Tree) {
  return headDiv(tree).props.children[1].props.children
}

function errorNode(tree: Tree) {
  return hojaDiv(tree).props.children[1]
}

function resumenDiv(tree: Tree) {
  return hojaDiv(tree).props.children[2]
}

function totalStrong(tree: Tree) {
  return resumenDiv(tree).props.children[0].props.children[2]
}

function completedStrong(tree: Tree) {
  return resumenDiv(tree).props.children[1].props.children[2]
}

function reportTable(tree: Tree) {
  return hojaDiv(tree).props.children[3]
}

function tableRows(tree: Tree) {
  return reportTable(tree).props.children[1].props.children
}

function emptyNode(tree: Tree) {
  return hojaDiv(tree).props.children[4]
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('WorkerReport', () => {
  it('binds the period input to period.month and forwards its change to setMonth', () => {
    const tree = setup(settledReport(EMPTY_TASKS, NO_ERROR))
    const input = monthInput(tree)

    expect(input.props.value).toBe(MONTH)
    const changeEvent = { target: { value: NEW_MONTH } }

    input.props.onChange(changeEvent)
    expect(fakes.setMonth).toHaveBeenCalledWith(NEW_MONTH)
  })

  it('wires the print button to handlePrint', () => {
    const tree = setup(settledReport(EMPTY_TASKS, NO_ERROR))

    printButton(tree).props.onClick()
    expect(fakes.handlePrint).toHaveBeenCalledTimes(1)
  })

  it('renders only the loading view while the report is loading', () => {
    const tree = setup(loadingReport())

    expect(tree.type).toBe(LoadingView)
    expect(tree.props).toEqual(NO_PROPS)
  })

  it('shows an alert paragraph with the error text when report.error is set', () => {
    const tree = setup(settledReport(EMPTY_TASKS, ERROR_TEXT))
    const error = errorNode(tree)

    expect(error.props.role).toBe(ALERT)
    expect(error.props.children).toBe(ERROR_TEXT)
  })

  it('does not render a <p> for the error slot when report.error is the empty string', () => {
    const tree = setup(settledReport(EMPTY_TASKS, NO_ERROR))

    expect(errorNode(tree)).toBe(NO_ERROR)
  })

  it('shows the empty-state message when there are no tasks and no error', () => {
    const tree = setup(settledReport(EMPTY_TASKS, NO_ERROR))
    const empty = emptyNode(tree)

    expect(empty.type).toBe(DIV_TAG)
    expect(empty.props.children).toBe(EMPTY_MESSAGE_KEY)
  })

  it('does not show the empty-state message when there is also an error', () => {
    const tree = setup(settledReport(EMPTY_TASKS, ERROR_TEXT))

    expect(emptyNode(tree)).toBe(false)
  })

  it('renders one WorkerTableRow per task, in order, each carrying the original task', () => {
    const tasks = [TASK_PENDING, TASK_DONE]
    const tree = setup(settledReport(tasks, NO_ERROR))
    const rows = tableRows(tree)

    expect(rows).toHaveLength(2)
    expect(rows[0].type).toBe(WorkerTableRow)
    expect(rows[0].props.task).toBe(TASK_PENDING)
    expect(rows[1].props.task).toBe(TASK_DONE)
  })

  it('counts only completed tasks in the completed summary', () => {
    const tasks = [TASK_PENDING, TASK_DONE, TASK_DONE_B]
    const tree = setup(settledReport(tasks, NO_ERROR))

    expect(completedStrong(tree).props.children).toBe(2)
  })

  it('shows tasks.length as the total regardless of the status mix', () => {
    const tasks = [TASK_PENDING, TASK_DONE, TASK_DONE_B]
    const tree = setup(settledReport(tasks, NO_ERROR))

    expect(totalStrong(tree).props.children).toBe(3)
  })
})
