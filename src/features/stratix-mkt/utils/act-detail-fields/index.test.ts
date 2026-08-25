import { describe, it, expect } from 'vitest'
import { camposDeActividad, fechaLarga } from './index'
import type { I18nKey } from '@/shared/i18n'

// La clave cruda alcanza: lo que se prueba es qué campo sale y con qué valor, no la traducción.
const t = (k: I18nKey) => k as string
const deps = { t, locale: 'es-ES', miembrosPorId: { u1: 'Ana Sinequipo', u2: 'Beto Medico' } }

const valorDe = (a: Parameters<typeof camposDeActividad>[0], label: string) =>
  camposDeActividad(a, deps).find(c => c.label === label)?.value

describe('camposDeActividad', () => {
  it('resuelve los ids de persona contra el mapa y cae a — si no está', () => {
    const a = { responsable_id: 'u1', solicitante_id: 'u9' }
    expect(valorDe(a, 'stratix.col.assignee')).toBe('Ana Sinequipo')
    expect(valorDe(a, 'stratix.detail.requestedBy')).toBe('—')
  })

  it('deriva el trimestre del mes cuando la fila no lo trae', () => {
    expect(valorDe({ mes: 'Agosto' }, 'stratix.detail.quarter')).toBe('Q3')
  })

  it('el trimestre guardado gana sobre el derivado del mes', () => {
    expect(valorDe({ mes: 'Agosto', trimestre: 'Q1' }, 'stratix.detail.quarter')).toBe('Q1')
  })

  it('verificado NO es booleano: muestra su valor, no "sí"', () => {
    expect(valorDe({ verificado: 'Pendiente' }, 'stratix.detail.verified')).toBe('stratix.verificado.pendiente')
    expect(valorDe({ verificado: 'Aprobado' }, 'stratix.detail.verified')).toBe('stratix.verificado.aprobado')
  })

  it('sin horas ni días muestra 0, no vacío', () => {
    expect(valorDe({}, 'stratix.detail.estHours')).toBe('0h')
    expect(valorDe({}, 'stratix.detail.prodDays')).toBe('0')
  })

  it('bloqueada usa sí/no porque ahí sí es booleano', () => {
    expect(valorDe({ bloqueada: true }, 'stratix.detail.blocked')).toBe('common.yes')
    expect(valorDe({}, 'stratix.detail.blocked')).toBe('common.no')
  })

  it('devuelve las quince filas siempre, aunque la actividad esté vacía', () => {
    expect(camposDeActividad({}, deps)).toHaveLength(15)
  })
})

describe('fechaLarga', () => {
  it('una fecha YYYY-MM-DD se lee en hora local, no en UTC', () => {
    // En UTC-4, `new Date('2026-07-30')` cae el 29 a las 20:00 y se mostraría "miércoles 29".
    expect(fechaLarga('2026-07-30', 'es-ES', t)).toContain('30')
    expect(fechaLarga('2026-07-30', 'es-ES', t)).toContain('julio')
  })

  it('sin fecha devuelve la clave de "sin fecha", no una fecha inválida', () => {
    expect(fechaLarga(undefined, 'es-ES', t)).toBe('stratix.detail.noDate')
    expect(fechaLarga('', 'es-ES', t)).toBe('stratix.detail.noDate')
  })
})
