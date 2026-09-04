import { describe, it, expect } from 'vitest'
import { payloadDeActividad } from './payload'
import type { NuevaActForm } from '@/features/tasks/types'

const form = (over: Partial<NuevaActForm> = {}): NuevaActForm => ({
  titulo: 'Reel de agosto', descripcion: '', empresa: 'EMC', responsable_id: 'u1',
  fecha_inicio: '2026-08-19', horas: '', dias_produccion: '',
  estado: 'Pendiente', fecha_entrega: '', solicitante_id: '', drive_url: '', ...over,
})

describe('payloadDeActividad', () => {
  it('imputa el período al mes de fecha_inicio, no al de hoy', () => {
    expect(payloadDeActividad(form()).fecha_inicio).toBe('2026-08-19')
    expect(payloadDeActividad(form()).mes).toBe('Agosto')
    expect(payloadDeActividad(form()).trimestre).toBe('Q3')
  })

  // El testigo tiene un CHECK con doce nombres exactos: un valor fuera de la lista revienta el
  // INSERT entero, así que un mes inválido escribe null y deja pasar la fila.
  it('escribe null en el testigo si la fecha no tiene mes', () => {
    const p = payloadDeActividad(form({ fecha_inicio: '' }))
    expect(p.mes).toBeNull()
    expect(p.trimestre).toBeNull()
  })

  // Editar tiene que poder LIMPIAR un campo, no sólo cambiarlo: PostgREST ignora las claves
  // ausentes, así que un opcional vacío va como null explícito y nunca omitido.
  it('manda null explícito por cada opcional vacío', () => {
    const p = payloadDeActividad(form())
    for (const k of ['descripcion', 'horas', 'dias_produccion', 'fecha_entrega', 'solicitante_id', 'drive_url']) {
      expect(k in p, `${k} tiene que viajar`).toBe(true)
      expect(p[k], `${k} tiene que ser null`).toBeNull()
    }
  })

  // Las horas son plata: van como número, porque '8' en una columna numeric la escribe bien pero
  // sumarla en el reporte concatena.
  it('convierte horas y días a número', () => {
    const p = payloadDeActividad(form({ horas: '8', dias_produccion: '2' }))
    expect(p.horas).toBe(8)
    expect(p.dias_produccion).toBe(2)
  })
})
