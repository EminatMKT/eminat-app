import { describe, it, expect } from 'vitest'
import { reportHtml } from './index'
import { STRATIX_LOGO_DATA } from './logo.constants'
import {
  PRODUCTION_REPORT_DISCLAIMER, PRODUCTION_REPORT_SLOGAN, REPORT_APPROVER_NAME, REPORT_APPROVER_TITLE,
} from './disclaimer.constants'
import type { I18nKey } from '@/shared/i18n'
import type { Actividad } from '@/features/tasks/types'

// El reporte impreso debe mostrar únicamente datos operativos de tareas.
// `t` devuelve la clave para verificar también qué rótulos aparecen.
const t = (k: I18nKey) => k

// `mes` es la clave del filtro ('YYYY-MM'); `hoy` es de 2027 para distinguirlo del período.
const acts: Actividad[] = [{ titulo: 'Post', fecha_inicio: '2026-08-17' }]
const datos = (intlLocale: string) => ({
  acts, nombre: 'Ada', mes: '2026-08', intlLocale,
  completadas: 1, nombrePorId: {}, t, hoy: new Date(2027, 0, 15),
})

describe('reportHtml — el período', () => {
  it('nombra el mes con su año y en el idioma de quien imprime, no la clave del filtro', () => {
    expect(reportHtml(datos('es-EC'))).toMatch(/agosto.*2026/i)
    expect(reportHtml(datos('en-US'))).toMatch(/August.*2026/i)
  })

  it('no imprime la clave cruda: `2026-08` es lo que se leía antes en la cabecera', () => {
    // Acotado a la región del período, no al documento entero: las fechas ISO de las filas
    // (p.ej. '2026-08-17') ya contienen '2026-08' legítimamente, dentro de <tbody>.
    const periodLabelMarker = 'stratix.report.period'
    const tableStartMarker = '<table'
    const rawFilterKey = '2026-08'
    const html = reportHtml(datos('es-EC'))
    const periodRegion = html.slice(html.indexOf(periodLabelMarker), html.indexOf(tableStartMarker))

    expect(periodRegion).not.toContain(rawFilterKey)
  })

  it('el año sale del período, no del reloj: en 2027 la hoja de agosto sigue diciendo 2026', () => {
    expect(reportHtml(datos('en-US'))).not.toMatch(/August 2027/i)
  })

  it('muestra únicamente KPIs y columnas operativas', () => {
    const html = reportHtml(datos('es-EC'))
    expect(html).toContain('stratix.report.totalTasks')
    expect(html).toContain('stratix.report.completed')
    expect(html).toContain('stratix.report.colTask')
    expect(html).toContain('stratix.report.colArea')
    expect(html).toContain('stratix.report.colAssignee')
    expect(html).toContain('stratix.report.colStatus')
    expect(html).not.toMatch(/totalHours|prodDays|colHours|colProdDays/)
  })

  it('deja el botón de imprimir antes de la tabla para que no quede perdido al final', () => {
    const html = reportHtml(datos('es-EC'))
    expect(html.indexOf('window.print()')).toBeLessThan(html.indexOf('<table'))
  })

  it('the assignee column lists every responsible, leader first', () => {
    const shared: Actividad[] = [{ titulo: 'Shared', fecha_inicio: '2026-08-17', responsables: [
      { usuario_id: 'u2', es_lider: false },
      { usuario_id: 'u1', es_lider: true },
    ] }]
    const html = reportHtml({ ...datos('en-US'), acts: shared, nombrePorId: { u1: 'Zoe', u2: 'Ana' } })
    expect(html).toContain('>Zoe, Ana</td>')
  })

  it('usa el rótulo traducido del botón compartido y no un "Print" fijo', () => {
    const html = reportHtml(datos('es-EC'))
    expect(html).toContain('common.print')
    expect(html).not.toContain('>Print</button>')
  })

  it('el encabezado muestra el logo, el eslogan y el disclaimer fijos, en ese orden, igual en cualquier idioma', () => {
    const logoImgTag = `<img src="${STRATIX_LOGO_DATA}"`
    const logoAltAttr = 'alt="Stratix Communications"'
    const headerFragments = [logoImgTag, logoAltAttr, PRODUCTION_REPORT_SLOGAN, PRODUCTION_REPORT_DISCLAIMER]
    const htmlEs = reportHtml(datos('es-EC'))
    const htmlEn = reportHtml(datos('en-US'))

    for (const html of [htmlEs, htmlEn]) {
      for (const fragment of headerFragments) {
        expect(html).toContain(fragment)
      }
      const logoIndex = html.indexOf(STRATIX_LOGO_DATA)
      const sloganIndex = html.indexOf(PRODUCTION_REPORT_SLOGAN)
      const disclaimerIndex = html.indexOf(PRODUCTION_REPORT_DISCLAIMER)
      expect(logoIndex).toBeLessThan(sloganIndex)
      expect(sloganIndex).toBeLessThan(disclaimerIndex)
    }
  })

  it('ya no imprime la vieja firma fija ni las claves de marca/título dentro del encabezado', () => {
    const headerStartMarker = 'border-bottom:2px solid #222'
    const headerEndMarker = 'display:flex;justify-content:space-between;align-items:flex-end'
    const headerOf = (html: string) => html.slice(html.indexOf(headerStartMarker), html.indexOf(headerEndMarker))
    const oldSignature = 'Powered by Stratix Communications.'
    const brandKey = 'tasks.report.brand'
    const titleKey = 'tasks.report.title'
    const removedFragments = [oldSignature, brandKey, titleKey]
    const htmlEs = reportHtml(datos('es-EC'))
    const htmlEn = reportHtml(datos('en-US'))

    for (const html of [htmlEs, htmlEn]) {
      for (const fragment of removedFragments) {
        expect(headerOf(html)).not.toContain(fragment)
      }
    }
  })
})

describe('reportHtml — la tabla: fechas y descripción', () => {
  it('agrega las cabeceras de fecha de inicio y fecha límite junto a las columnas existentes, en orden', () => {
    const assigneeHeaderKey = 'stratix.report.colAssignee'
    const startHeaderKey = 'stratix.new.start'
    const deadlineHeaderKey = 'tasks.report.deadline'
    const statusHeaderKey = 'stratix.report.colStatus'
    const html = reportHtml(datos('es-EC'))

    expect(html).toContain(startHeaderKey)
    expect(html).toContain(deadlineHeaderKey)
    expect(html.indexOf(assigneeHeaderKey)).toBeLessThan(html.indexOf(startHeaderKey))
    expect(html.indexOf(startHeaderKey)).toBeLessThan(html.indexOf(deadlineHeaderKey))
    expect(html.indexOf(deadlineHeaderKey)).toBeLessThan(html.indexOf(statusHeaderKey))
  })

  it('muestra la descripción debajo del título, en la misma fila, cuando la tarea la tiene', () => {
    const taskTitle = 'WithDesc'
    const taskDescription = 'Texto de detalle'
    const descriptionWrapperStyle = 'white-space:pre-wrap'
    const withDesc: Actividad[] = [{ titulo: taskTitle, descripcion: taskDescription, fecha_inicio: '2026-01-01' }]
    const html = reportHtml({ ...datos('es-EC'), acts: withDesc })

    expect(html).toContain(descriptionWrapperStyle)
    expect(html).toContain(taskDescription)
    expect(html.indexOf(taskTitle)).toBeLessThan(html.indexOf(taskDescription))
  })

  it('no agrega el bloque de descripción cuando la tarea no tiene descripción', () => {
    const taskTitle = 'NoDesc'
    const descriptionWrapperStyle = 'white-space:pre-wrap'
    const noDesc: Actividad[] = [{ titulo: taskTitle, fecha_inicio: '2026-01-01' }]
    const html = reportHtml({ ...datos('es-EC'), acts: noDesc })

    expect(html).toContain(taskTitle)
    expect(html).not.toContain(descriptionWrapperStyle)
  })

  it('fecha_inicio aparece en su celda cuando está presente', () => {
    const startDate = '2026-08-17'
    const html = reportHtml(datos('es-EC'))
    expect(html).toContain(startDate)
  })

  it('fecha_entrega aparece en su celda cuando está presente', () => {
    const deadlineDate = '2026-08-31'
    const withDeadline: Actividad[] = [{ titulo: 'Deadline', fecha_inicio: '2026-08-01', fecha_entrega: deadlineDate }]
    const html = reportHtml({ ...datos('es-EC'), acts: withDeadline })

    expect(html).toContain(deadlineDate)
  })

  it('fecha_entrega cae al guion largo cuando falta, dentro del cuerpo de la tabla', () => {
    const tbodyOpenTag = '<tbody>'
    const tbodyCloseTag = '</tbody>'
    const dateFallbackDash = '—'
    const html = reportHtml(datos('es-EC'))
    const tbody = html.slice(html.indexOf(tbodyOpenTag), html.indexOf(tbodyCloseTag))

    expect(tbody).toContain(dateFallbackDash)
  })
})

describe('reportHtml — impresión', () => {
  it('declara la regla CSS que repite la cabecera de la tabla en cada página impresa', () => {
    // Guarda de mecanismo: solo verifica que la declaración CSS esté en el HTML devuelto.
    // No prueba que Chromium efectivamente repita la cabecera al paginar (eso es soporte
    // estándar de CSS Paged Media del navegador, no lógica de esta función).
    const paginationCss = 'td { overflow-wrap:anywhere; } table { table-layout:fixed; } thead { display:table-header-group; }'
    const html = reportHtml(datos('es-EC'))

    expect(html).toContain(paginationCss)
  })
})

describe('reportHtml — la firma', () => {
  it('incluye el bloque de firma con quien reporta y el aprobador fijo, en cualquier idioma', () => {
    const teamMemberCaption = 'Miembro del equipo'
    const expectedFragments = [
      'Ada', teamMemberCaption, REPORT_APPROVER_NAME, REPORT_APPROVER_TITLE,
    ]

    for (const html of [reportHtml(datos('es-EC')), reportHtml(datos('en-US'))]) {
      for (const fragment of expectedFragments) {
        expect(html).toContain(fragment)
      }
    }
  })

  it('ported verbatim per the tracked AGENTS.md exception (see disclaimer.constants.ts): approver stays fixed no matter who the report is for, not yet read from the role catalog', () => {
    const otherTeamMemberName = 'Zoe'
    const html = reportHtml({ ...datos('en-US'), nombre: otherTeamMemberName })
    const expectedFragments = [otherTeamMemberName, REPORT_APPROVER_NAME, REPORT_APPROVER_TITLE]

    for (const fragment of expectedFragments) {
      expect(html).toContain(fragment)
    }
  })

  it('pone la firma después de la tabla de tareas, no antes', () => {
    const html = reportHtml(datos('es-EC'))
    const tableEndMarker = '</table>'

    expect(html.indexOf(tableEndMarker)).toBeLessThan(html.indexOf(REPORT_APPROVER_NAME))
    expect(html.indexOf(tableEndMarker)).toBeLessThan(html.indexOf(REPORT_APPROVER_TITLE))
  })
})
