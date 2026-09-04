import { describe, it, expect } from 'vitest'
import { oneOf } from '@/shared/hooks'
import { STRATIX_TAB, STRATIX_TABS } from './index'

describe('catálogo de tabs de Stratix después de la mudanza', () => {
  it('quedan las tres que no son de tareas', () => {
    expect([...STRATIX_TABS]).toEqual(['social', 'competencia', 'equipo'])
  })

  // El riesgo real del deploy: mucha gente tiene 'kanban' guardado en `tab-stratix`. El
  // `oneOf(...STRATIX_TABS)` del provider lo rechaza y gana el default; sin eso, la primera
  // pantalla después del deploy es blanca.
  it('rechaza las cuatro secciones que se fueron a /tasks', () => {
    const valida = oneOf(...STRATIX_TABS)
    for (const ida of ['overview', 'kanban', 'solicitudes', 'reporte']) {
      expect(valida(ida), `${ida} ya no existe acá`).toBe(false)
    }
  })

  it('acepta las que quedaron', () => {
    const valida = oneOf(...STRATIX_TABS)
    expect(valida('equipo')).toBe(true)
    expect(valida('social')).toBe(true)
  })

  // El default es a lo que cae una preferencia rechazada: si siguiera siendo 'kanban', la
  // degradación llevaría a una sección que tampoco existe.
  it('la pestaña inicial sigue existiendo', () => {
    expect(oneOf(...STRATIX_TABS)(STRATIX_TAB.SOCIAL)).toBe(true)
  })
})
