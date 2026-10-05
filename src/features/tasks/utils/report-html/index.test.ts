import { describe, it, expect } from 'vitest'
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
  completadas: 1, nombrePorId: {}, t, hoy: new Date(2027, 0, 15),
})

describe('reportHtml — el período', () => {
  it('nombra el mes con su año y en el idioma de quien imprime, no la clave del filtro', () => {
    expect(reportHtml(datos('es-EC'))).toMatch(/agosto.*2026/i)
    expect(reportHtml(datos('en-US'))).toMatch(/August.*2026/i)
  })

  it('no imprime la clave cruda: `2026-08` es lo que se leía antes en la cabecera', () => {
    expect(reportHtml(datos('es-EC'))).not.toContain('2026-08')
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
})
