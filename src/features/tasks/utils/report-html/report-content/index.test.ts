import { describe, it, expect } from 'vitest'
import type { I18nKey } from '@/shared/i18n'
import type { Actividad } from '@/features/tasks/types'
import type { Datos } from '../types'
import headerBlock from '../header-block'
import buildMemberPeriodRow from '../member-period-row'
import buildTableHeaders from '../table-headers'
import buildTableRows from '../table-rows'
import tableSection from '../table-section'
import emptyNotice from '../empty-notice'
import signatureBlock from '../signature-block'
import reportFooter from '../report-footer'
import documentHead from '../document-head'
import reportContent from './index'

// Covers only reportContent's own job: wiring the nine already-tested sub-modules in the
// right order with the right slices of Datos/period/title. Their own internals are tested
// in their own suites, not re-verified here.
const t = (k: I18nKey) => k
const CONTENT_TEST_ORIGIN = 'http://127.0.0.1:5000'
const CONTENT_TEST_PERIOD = 'agosto de 2026'
const CONTENT_TEST_TITLE = 'Reporte de pago — Ada'
const NOTHING = ''
const TABLE_OPEN_TAG = '<table'
const acts: Actividad[] = [{ titulo: 'Post', fecha_inicio: '2026-08-17' }]
const baseDatos: Datos = {
  acts,
  nombre: 'Ada',
  mes: '2026-08',
  intlLocale: 'es-MX',
  nombrePorId: {},
  t,
  hoy: new Date(2027, 0, 15),
  origin: CONTENT_TEST_ORIGIN,
}

describe('reportContent — composition and wiring', () => {
  it(
    'builds the exact document by concatenating documentHead, header/period, table, ' +
      'and notice/signature/footer, in that order, with no separator between them',
    () => {
    const html = reportContent(baseDatos, CONTENT_TEST_PERIOD, CONTENT_TEST_TITLE)
    const top = `${headerBlock(baseDatos.origin, t)}`
      + `${buildMemberPeriodRow(baseDatos.nombre, CONTENT_TEST_PERIOD, t)}`
    const task = tableSection(
      buildTableHeaders(t),
      buildTableRows(baseDatos.acts, baseDatos.nombrePorId),
    )
    const bottom = `${emptyNotice(baseDatos.acts, t)}${signatureBlock(baseDatos.nombre)}`
      + `${reportFooter(baseDatos.hoy, t)}`
    const expected = `${documentHead(CONTENT_TEST_TITLE)}${top}${task}${bottom}</body></html>`

    expect(html).toBe(expected)
  })

  it(
    'shows nombre in two separate places, straddling the task table: ' +
      'the member/period row and the signature block',
    () => {
    const uniqueName = 'Zoe Unique Signatory'
    const datos: Datos = { ...baseDatos, nombre: uniqueName }
    const html = reportContent(datos, CONTENT_TEST_PERIOD, CONTENT_TEST_TITLE)
    const firstOccurrence = html.indexOf(uniqueName)
    const lastOccurrence = html.lastIndexOf(uniqueName)
    const tableIndex = html.indexOf(TABLE_OPEN_TAG)

    expect(firstOccurrence).toBeGreaterThanOrEqual(0)
    expect(lastOccurrence).toBeGreaterThan(firstOccurrence)
    expect(tableIndex).toBeGreaterThan(firstOccurrence)
    expect(tableIndex).toBeLessThan(lastOccurrence)
  })

  it(
    'threads hoy through to the footer specifically, leaving the rest of the document untouched',
    () => {
    const hoyA = new Date(2027, 0, 15)
    const hoyB = new Date(2030, 5, 1)
    const datosA: Datos = { ...baseDatos, hoy: hoyA }
    const datosB: Datos = { ...baseDatos, hoy: hoyB }
    const htmlA = reportContent(datosA, CONTENT_TEST_PERIOD, CONTENT_TEST_TITLE)
    const htmlB = reportContent(datosB, CONTENT_TEST_PERIOD, CONTENT_TEST_TITLE)
    const footerA = reportFooter(hoyA, t)
    const footerB = reportFooter(hoyB, t)

    expect(footerA).not.toBe(footerB)
    expect(htmlA).toContain(footerA)
    expect(htmlB).toContain(footerB)
    expect(htmlA.replace(footerA, NOTHING)).toBe(htmlB.replace(footerB, NOTHING))
  })

  it('still produces the empty-notice content, without crashing, when acts is empty', () => {
    const emptyDatos: Datos = { ...baseDatos, acts: [] }
    const expectedNotice = emptyNotice([], t)

    expect(expectedNotice).not.toBe(NOTHING)
    expect(() => reportContent(emptyDatos, CONTENT_TEST_PERIOD, CONTENT_TEST_TITLE)).not.toThrow()

    const html = reportContent(emptyDatos, CONTENT_TEST_PERIOD, CONTENT_TEST_TITLE)

    expect(html).toContain(expectedNotice)
  })
})
