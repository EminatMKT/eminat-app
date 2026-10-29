import { describe, it, expect } from 'vitest'
import { PRODUCTION_REPORT_DISCLAIMER } from './disclaimer'
import { reportHtml } from './index'
import type { I18nKey } from '@/shared/i18n'
import type { Actividad } from '@/features/tasks/types'

// El reporte impreso debe mostrar únicamente datos operativos de tareas.
// `t` devuelve la clave para verificar también qué rótulos aparecen.
const t = (k: I18nKey) => k

// `mes` es la clave del filtro ('YYYY-MM'); `hoy` es de 2027 para distinguirlo del período.
const acts: Actividad[] = [{ titulo: 'Post', fecha_inicio: '2026-08-17' }]
const datos = (intlLocale: string) => ({
  acts, nombre: 'Ada', mes: '2026-08', intlLocale,
  nombrePorId: {}, t, hoy: new Date(2027, 0, 15),
})

describe('reportHtml — el período', () => {
  it('nombra el mes con su año y en el idioma de quien imprime, no la clave del filtro', () => {
    expect(reportHtml(datos('es-EC'))).toMatch(/agosto.*2026/i)
    expect(reportHtml(datos('en-US'))).toMatch(/August.*2026/i)
  })

  it('no imprime la clave cruda: `2026-08` es lo que se leía antes en la cabecera', () => {
    expect(reportHtml(datos('es-EC'))).not.toContain('>2026-08<')
  })

  it('el año sale del período, no del reloj: en 2027 la hoja de agosto sigue diciendo 2026', () => {
    expect(reportHtml(datos('en-US'))).not.toMatch(/August 2027/i)
  })

  it('omite resúmenes y estados sin borrar el trabajo', () => {
    const html = reportHtml(datos('es-EC'))
    expect(html).not.toContain('stratix.report.totalTasks')
    expect(html).not.toContain('stratix.report.completed')
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
})

it('prints the exact disclaimer once immediately under the heading in every locale and empty report', () => {
  for (const locale of ['es-EC', 'en-US']) for (const rows of [acts, []]) {
    const html = reportHtml({ ...datos(locale), acts: rows })
    expect(html.split(PRODUCTION_REPORT_DISCLAIMER)).toHaveLength(2)
    expect(html).toMatch(/Full-service agency · Integrated marketing<\/div>\s*<p[^>]*>El beneficiario/)
  }
})
it('preserves titles, descriptions, assignees and dates, escaping HTML; never renders status or effort', () => {
  const html = reportHtml({ ...datos('en-US'), acts: [{
    titulo: 'Completed design review', descripcion: '<script>bad()</script>\nWork description',
    estado: 'Completado', horas: 999, dias_produccion: 888,
    fecha_inicio: '2026-08-10', fecha_entrega: '2026-08-20',
  }] })
  expect(html).toContain('Completed design review')
  expect(html).toContain('&lt;script&gt;bad()&lt;/script&gt;')
  expect(html).toContain('Work description')
  expect(html).toContain('2026-08-10')
  expect(html).toContain('2026-08-20')
  expect(html).toContain('stratix.estado.completado')
  expect(html).not.toMatch(/>999<|>888<|totalTasks|report.completed/)
})
