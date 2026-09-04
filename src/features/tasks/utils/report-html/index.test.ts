import { describe, it, expect } from 'vitest'
import { reportHtml } from './index'
import type { I18nKey } from '@/shared/i18n'
import type { Actividad } from '@/features/tasks/types'

// Esta hoja se imprime y se firma en un pago: el período que dice es el período que se cobra.
// Por eso está testeado y no sólo tipado — un `2026-08` impreso no rompe nada, se paga.
// `t` devuelve la clave: acá no se verifica el diccionario, se verifica el período.
const t = (k: I18nKey) => k

// `mes` es la clave del filtro ('YYYY-MM'); `fecha_inicio` es la fecha real de la fila. Las dos
// llevan agosto de 2026 a propósito: `hoy` es de 2027 para que un año tomado del reloj cante.
const acts: Actividad[] = [{ titulo: 'Post', fecha_inicio: '2026-08-17' }]
const datos = (intlLocale: string) => ({
  acts, nombre: 'Ada', mes: '2026-08', intlLocale,
  completadas: 1, horas: 4, dias: 2, nombrePorId: {}, t, hoy: new Date(2027, 0, 15),
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

  it('la columna de cada fila sale de `fecha_inicio`, con su año', () => {
    expect(reportHtml(datos('en-US'))).toMatch(/Aug 2026/i)
  })

  it('una fila sin fecha imprime el guion, no "Invalid Date"', () => {
    const html = reportHtml({ ...datos('es-EC'), acts: [{ titulo: 'Sin fecha' }] })
    expect(html).not.toMatch(/Invalid Date/i)
    expect(html).toContain('text-align:center">—</td>')
  })
})
