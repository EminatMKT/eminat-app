import { describe, it, expect } from 'vitest'
import { reportHtml } from './index'
import {
  PRODUCTION_REPORT_DISCLAIMER,
  PRODUCTION_REPORT_SLOGAN,
  REPORT_APPROVER_NAME,
  REPORT_APPROVER_TITLE,
} from './disclaimer/constants'
import { localeConfig, type I18nKey } from '@/shared/i18n'
import type { Actividad } from '@/features/tasks/types'

// The printed report must show only operational task data.
// `t` returns the key itself, so the test can also check which labels show up.
const t = (k: I18nKey) => k

const SPANISH_LOCALE = localeConfig.intl.es
const ENGLISH_LOCALE = localeConfig.intl.en

// `mes` is the filter's key ('YYYY-MM'); `hoy` is from 2027, to tell it apart from the period.
// `origin` stands in for `window.location.origin`: the caller's host, used to build the logo URL.
const REPORT_TEST_ORIGIN = 'http://127.0.0.1:3000'
const LOGO_URL_PATH = '/brand/stratix-communications.svg'
const EXPECTED_LOGO_URL = `${REPORT_TEST_ORIGIN}${LOGO_URL_PATH}`
const acts: Actividad[] = [{ titulo: 'Post', fecha_inicio: '2026-08-17' }]
const baseDatos = {
  acts,
  nombre: 'Ada',
  mes: '2026-08',
  completadas: 1,
  nombrePorId: {},
  t,
  hoy: new Date(2027, 0, 15),
  origin: REPORT_TEST_ORIGIN,
}
const datos = (intlLocale: string) => ({ ...baseDatos, intlLocale })

describe('reportHtml — the period', () => {
  it(
    'names the month with its year, in the language of whoever prints it, not the filter key',
    () => {
    expect(reportHtml(datos(SPANISH_LOCALE))).toMatch(/agosto.*2026/i)
    expect(reportHtml(datos(ENGLISH_LOCALE))).toMatch(/August.*2026/i)
  })

  it('does not print the raw key: `2026-08` is what used to show in the header', () => {
    // Scoped to the period region, not the whole document: rows' ISO dates
    // (e.g. '2026-08-17') legitimately already contain '2026-08', inside <tbody>.
    const periodLabelMarker = 'stratix.report.period'
    const tableStartMarker = '<table'
    const rawFilterKey = '2026-08'
    const html = reportHtml(datos(SPANISH_LOCALE))
    const periodRegion = html.slice(html.indexOf(periodLabelMarker), html.indexOf(tableStartMarker))

    expect(periodRegion).not.toContain(rawFilterKey)
  })

  it(
    'the year comes from the period, not the clock: in 2027 the August sheet still says 2026',
    () => {
    expect(reportHtml(datos(ENGLISH_LOCALE))).not.toMatch(/August 2027/i)
  })

  it('does not show the KPI summary, only operative columns', () => {
    const totalTasksKey = 'stratix.report.totalTasks'
    const completedKey = 'stratix.report.completed'
    const operativeColumnKeys = [
      'stratix.report.colTask',
      'stratix.report.colArea',
      'stratix.report.colAssignee',
      'stratix.report.colStatus',
    ]
    const html = reportHtml(datos(SPANISH_LOCALE))

    expect(html).not.toContain(totalTasksKey)
    expect(html).not.toContain(completedKey)

    for (const columnKey of operativeColumnKeys) {
      expect(html).toContain(columnKey)
    }
    expect(html).not.toMatch(/totalHours|prodDays|colHours|colProdDays/)
  })

  it('keeps the print button before the table so it is not lost at the end', () => {
    const printButtonScript = 'window.print()'
    const tableStartMarker = '<table'
    const html = reportHtml(datos(SPANISH_LOCALE))

    expect(html.indexOf(printButtonScript)).toBeLessThan(html.indexOf(tableStartMarker))
  })

  it('the assignee column lists every responsible, leader first', () => {
    const shared: Actividad[] = [{ titulo: 'Shared', fecha_inicio: '2026-08-17', responsables: [
      { usuario_id: 'u2', es_lider: false },
      { usuario_id: 'u1', es_lider: true },
    ] }]
    const expectedAssigneeCell = '>Zoe, Ana</td>'
    const namesById = { u1: 'Zoe', u2: 'Ana' }
    const html = reportHtml({ ...datos(ENGLISH_LOCALE), acts: shared, nombrePorId: namesById })

    expect(html).toContain(expectedAssigneeCell)
  })

  it('uses the shared button\'s translated label, not a fixed "Print"', () => {
    const printLabelKey = 'common.print'
    const hardcodedPrintButton = '>Print</button>'
    const html = reportHtml(datos(SPANISH_LOCALE))

    expect(html).toContain(printLabelKey)
    expect(html).not.toContain(hardcodedPrintButton)
  })

  it(
    'the header shows the fixed logo, slogan, and disclaimer, in that order, ' +
      'the same in any language',
    () => {
    const logoImgTag = `<img src="${EXPECTED_LOGO_URL}"`
    const logoAltAttr = 'alt="Stratix Communications"'
    const headerFragments = [
      logoImgTag,
      logoAltAttr,
      PRODUCTION_REPORT_SLOGAN,
      PRODUCTION_REPORT_DISCLAIMER,
    ]
    const htmlEs = reportHtml(datos(SPANISH_LOCALE))
    const htmlEn = reportHtml(datos(ENGLISH_LOCALE))

    for (const html of [htmlEs, htmlEn]) {
      for (const fragment of headerFragments) {
        expect(html).toContain(fragment)
      }
      const logoIndex = html.indexOf(EXPECTED_LOGO_URL)
      const sloganIndex = html.indexOf(PRODUCTION_REPORT_SLOGAN)
      const disclaimerIndex = html.indexOf(PRODUCTION_REPORT_DISCLAIMER)

      expect(logoIndex).toBeLessThan(sloganIndex)
      expect(sloganIndex).toBeLessThan(disclaimerIndex)
    }
  })

  it('builds the logo URL from the caller\'s origin, not a fixed host', () => {
    const otherOrigin = 'https://app.stratixsolutions.us'
    const expectedOtherLogoUrl = `${otherOrigin}${LOGO_URL_PATH}`
    const html = reportHtml({ ...datos(SPANISH_LOCALE), origin: otherOrigin })

    expect(html).toContain(`<img src="${expectedOtherLogoUrl}"`)
    expect(html).not.toContain(EXPECTED_LOGO_URL)
  })

  it('no longer prints the old fixed signature or the brand/title keys inside the header', () => {
    const headerStartMarker = 'border-bottom:2px solid #222'
    const headerEndMarker = 'display:flex;justify-content:space-between;align-items:flex-end'
    const headerOf = (html: string) =>
      html.slice(html.indexOf(headerStartMarker), html.indexOf(headerEndMarker))
    const oldSignature = 'Powered by Stratix Communications.'
    const brandKey = 'tasks.report.brand'
    const titleKey = 'tasks.report.title'
    const removedFragments = [oldSignature, brandKey, titleKey]
    const htmlEs = reportHtml(datos(SPANISH_LOCALE))
    const htmlEn = reportHtml(datos(ENGLISH_LOCALE))

    for (const html of [htmlEs, htmlEn]) {
      for (const fragment of removedFragments) {
        expect(headerOf(html)).not.toContain(fragment)
      }
    }
  })
})

describe('reportHtml — the table: dates and description', () => {
  it('adds the start date and deadline headers alongside the existing columns, in order', () => {
    const assigneeHeaderKey = 'stratix.report.colAssignee'
    const startHeaderKey = 'stratix.new.start'
    const deadlineHeaderKey = 'tasks.report.deadline'
    const statusHeaderKey = 'stratix.report.colStatus'
    const html = reportHtml(datos(SPANISH_LOCALE))

    expect(html).toContain(startHeaderKey)
    expect(html).toContain(deadlineHeaderKey)
    expect(html.indexOf(assigneeHeaderKey)).toBeLessThan(html.indexOf(startHeaderKey))
    expect(html.indexOf(startHeaderKey)).toBeLessThan(html.indexOf(deadlineHeaderKey))
    expect(html.indexOf(deadlineHeaderKey)).toBeLessThan(html.indexOf(statusHeaderKey))
  })

  it('shows the description below the title, in the same row, when the task has one', () => {
    const taskTitle = 'WithDesc'
    const taskDescription = 'Texto de detalle'
    const descriptionWrapperStyle = 'white-space:pre-wrap'
    const withDesc: Actividad[] = [{
      titulo: taskTitle,
      descripcion: taskDescription,
      fecha_inicio: '2026-01-01',
    }]
    const html = reportHtml({ ...datos(SPANISH_LOCALE), acts: withDesc })

    expect(html).toContain(descriptionWrapperStyle)
    expect(html).toContain(taskDescription)
    expect(html.indexOf(taskTitle)).toBeLessThan(html.indexOf(taskDescription))
  })

  it('does not add the description block when the task has no description', () => {
    const taskTitle = 'NoDesc'
    const descriptionWrapperStyle = 'white-space:pre-wrap'
    const noDesc: Actividad[] = [{ titulo: taskTitle, fecha_inicio: '2026-01-01' }]
    const html = reportHtml({ ...datos(SPANISH_LOCALE), acts: noDesc })

    expect(html).toContain(taskTitle)
    expect(html).not.toContain(descriptionWrapperStyle)
  })

  it('fecha_inicio appears in its cell when present', () => {
    const startDate = '2026-08-17'
    const html = reportHtml(datos(SPANISH_LOCALE))

    expect(html).toContain(startDate)
  })

  it('fecha_entrega appears in its cell when present', () => {
    const deadlineDate = '2026-08-31'
    const withDeadline: Actividad[] = [{
      titulo: 'Deadline',
      fecha_inicio: '2026-08-01',
      fecha_entrega: deadlineDate,
    }]
    const html = reportHtml({ ...datos(SPANISH_LOCALE), acts: withDeadline })

    expect(html).toContain(deadlineDate)
  })

  it('fecha_entrega falls back to the long dash when missing, inside the table body', () => {
    const tbodyOpenTag = '<tbody>'
    const tbodyCloseTag = '</tbody>'
    const dateFallbackDash = '—'
    const html = reportHtml(datos(SPANISH_LOCALE))
    const tbody = html.slice(html.indexOf(tbodyOpenTag), html.indexOf(tbodyCloseTag))

    expect(tbody).toContain(dateFallbackDash)
  })
})

describe('reportHtml — printing', () => {
  it('declares the CSS rule that repeats the table header on every printed page', () => {
    // Mechanism guard: only verifies the CSS declaration is present in the returned HTML.
    // It does not prove Chromium actually repeats the header when paginating (that's
    // standard browser CSS Paged Media support, not this function's own logic).
    const paginationCss = 'td { overflow-wrap:anywhere; } table { table-layout:fixed; } thead { display:table-header-group; }'
    const html = reportHtml(datos(SPANISH_LOCALE))

    expect(html).toContain(paginationCss)
  })
})

describe('reportHtml — the signature', () => {
  it(
    'includes the signature block with who is reporting and the fixed approver, in any language',
    () => {
    const teamMemberCaption = 'Miembro del equipo'
    const expectedFragments = [
      'Ada', teamMemberCaption, REPORT_APPROVER_NAME, REPORT_APPROVER_TITLE,
    ]

    for (const html of [reportHtml(datos(SPANISH_LOCALE)), reportHtml(datos(ENGLISH_LOCALE))]) {
      for (const fragment of expectedFragments) {
        expect(html).toContain(fragment)
      }
    }
  })

  it(
    'ported verbatim per the tracked AGENTS.md exception (see disclaimer/constants.ts): ' +
      'approver stays fixed no matter who the report is for, not yet read from the role catalog',
    () => {
    const otherTeamMemberName = 'Zoe'
    const html = reportHtml({ ...datos(ENGLISH_LOCALE), nombre: otherTeamMemberName })
    const expectedFragments = [otherTeamMemberName, REPORT_APPROVER_NAME, REPORT_APPROVER_TITLE]

    for (const fragment of expectedFragments) {
      expect(html).toContain(fragment)
    }
  })

  it('puts the signature after the task table, not before', () => {
    const html = reportHtml(datos(SPANISH_LOCALE))
    const tableEndMarker = '</table>'

    expect(html.indexOf(tableEndMarker)).toBeLessThan(html.indexOf(REPORT_APPROVER_NAME))
    expect(html.indexOf(tableEndMarker)).toBeLessThan(html.indexOf(REPORT_APPROVER_TITLE))
  })
})
