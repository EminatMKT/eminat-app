import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { ESTADO } from '@/shared/constants/domain'
import type { reportHtml } from '@/features/tasks/utils/report-html'
import type * as SharedUtilsModule from '@/shared/utils'
import type { Row, PrintAuthor, PrintContext } from '../types'

type Payload = Parameters<typeof reportHtml>[0]

const { fakes, reportHtmlModulePath, sharedUtilsModulePath } = vi.hoisted(() => ({
  fakes: {
    reportHtml: vi.fn((_payload: Payload) => '<html>mock</html>'),
    now: vi.fn(() => new Date(2027, 0, 15)),
  },
  reportHtmlModulePath: '@/features/tasks/utils/report-html',
  sharedUtilsModulePath: '@/shared/utils',
}))

vi.mock(reportHtmlModulePath, () => ({ reportHtml: fakes.reportHtml }))
vi.mock(sharedUtilsModulePath, async (importOriginal) => {
  const actual = await importOriginal<typeof SharedUtilsModule>()

  return { ...actual, now: fakes.now }
})

import printWorkerReport from './index'

const windowGlobal = 'window'
const t: PrintContext['t'] = (k) => k
const author: PrintAuthor = { id: 'u1', nombre: 'Ada' }
const ctx: PrintContext = { mes: '2026-08', intlLocale: 'es-EC', t }
const NO_OVERRIDES: Partial<Row> = {}

const row = (overrides: Partial<Row> = NO_OVERRIDES): Row => ({
  id: 'r1',
  titulo: 'Post',
  empresa: 'EMC',
  estado: ESTADO.COMPLETADO,
  fecha_inicio: '2026-08-17',
  fecha_entrega: null,
  ...overrides,
})

const openWindow = () => {
  const w = { document: { write: vi.fn(), close: vi.fn() } }
  const windowStub = { open: vi.fn(() => w) }

  vi.stubGlobal(windowGlobal, windowStub)

  return w
}

const blockPopup = () => {
  const windowStub = { open: vi.fn(() => null) }

  vi.stubGlobal(windowGlobal, windowStub)
}

const capturePayload = (rows: Row[]): Payload => {
  openWindow()
  printWorkerReport(rows, author, ctx)

  return fakes.reportHtml.mock.calls[0][0]
}

beforeEach(() => {
  fakes.reportHtml.mockClear()
  fakes.now.mockClear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('printWorkerReport', () => {
  it('a blocked popup returns early without throwing and never calls reportHtml', () => {
    blockPopup()

    expect(() => printWorkerReport([row()], author, ctx)).not.toThrow()
    expect(fakes.reportHtml).not.toHaveBeenCalled()
  })

  it('an empty rows array still calls reportHtml once, with acts: [] and no completadas field on the payload', () => {
    const payload = capturePayload([])
    const removedCompletadasKey = 'completadas'

    expect(payload.acts).toEqual([])
    expect(payload).not.toHaveProperty(removedCompletadasKey)
    expect(fakes.reportHtml).toHaveBeenCalledTimes(1)
  })

  it('attaches the author as sole leader responsable to every row, not just the first', () => {
    const rows = [row({ id: 'r1' }), row({ id: 'r2', titulo: 'Segunda' })]
    const payload = capturePayload(rows)
    const expectedResponsables = [{ usuario_id: 'u1', es_lider: true }]

    expect(payload.acts).toHaveLength(2)
    expect(payload.acts[0]).toEqual({ ...rows[0], responsables: expectedResponsables })
    expect(payload.acts[1]).toEqual({ ...rows[1], responsables: expectedResponsables })
  })

  it('acts preserve every row regardless of estado — no filtering survived removing completadas', () => {
    const rows = [
      row({ id: 'r1', estado: ESTADO.COMPLETADO }),
      row({ id: 'r2', estado: ESTADO.EN_PROCESO }),
      row({ id: 'r3', estado: ESTADO.COMPLETADO }),
    ]
    const payload = capturePayload(rows)

    expect(payload.acts).toHaveLength(3)
    expect(payload.acts.map(a => a.id)).toEqual(['r1', 'r2', 'r3'])
  })

  it('nombrePorId keys specifically by author.id', () => {
    const payload = capturePayload([row()])

    expect(payload.nombrePorId).toEqual({ u1: 'Ada' })
  })

  it('passes nombre, mes, intlLocale and t straight through from author/ctx', () => {
    const payload = capturePayload([row()])

    expect(payload.nombre).toBe(author.nombre)
    expect(payload.mes).toBe(ctx.mes)
    expect(payload.intlLocale).toBe(ctx.intlLocale)
    expect(payload.t).toBe(t)
  })

  it('hoy is a Date built through the now() wrapper, not a bare new Date()', () => {
    const payload = capturePayload([row()])

    expect(fakes.now).toHaveBeenCalled()
    expect(payload.hoy).toEqual(new Date(2027, 0, 15))
  })

  it('writes the HTML reportHtml returned into the popup, then closes it', () => {
    const specificMarkup = '<html>specific-markup</html>'

    fakes.reportHtml.mockReturnValueOnce(specificMarkup)
    const w = openWindow()

    printWorkerReport([row()], author, ctx)

    expect(w.document.write).toHaveBeenCalledWith(specificMarkup)
    expect(w.document.close).toHaveBeenCalledTimes(1)
    expect(w.document.write.mock.invocationCallOrder[0])
      .toBeLessThan(w.document.close.mock.invocationCallOrder[0])
  })
})
