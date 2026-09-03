import { describe, it, expect } from 'vitest'
import { payloadDeActividad, payloadDeAlta } from './payload'
import type { NuevaActForm } from '@/features/stratix-mkt/types'

const form = (over: Partial<NuevaActForm> = {}): NuevaActForm => ({
  titulo: 'Reel de agosto', descripcion: '', empresa: 'EMC', responsable_id: 'u1',
  fecha_inicio: '2026-08-19', horas: '', dias_produccion: '',
  estado: 'Pendiente', fecha_entrega: '', solicitante_id: '', drive_url: '', ...over,
})

describe('payloadDeAlta', () => {
  it('agrega el creador al payload compartido', () => {
    const p = payloadDeAlta(form(), 'u9')
    expect(p.created_by_id).toBe('u9')
    // Todo lo demás sale del payload compartido: crear y editar no se desincronizan.
    expect(p.titulo).toBe('Reel de agosto')
    expect(p.fecha_inicio).toBe('2026-08-19')
  })

  // Mientras el perfil carga no hay id. Una tarea sin creador es válida —las viejas lo son— y
  // es preferible a un INSERT que revienta con "invalid input syntax for type uuid".
  it('escribe null si todavía no hay usuario', () => {
    expect(payloadDeAlta(form(), undefined).created_by_id).toBeNull()
    expect(payloadDeAlta(form(), '').created_by_id).toBeNull()
  })

  // La razón de que exista una función aparte: el payload de EDICIÓN viaja completo y con
  // nulls, así que si `created_by_id` estuviera adentro, cada edición borraría al creador.
  it('el payload compartido NO lleva la clave, ni siquiera en null', () => {
    expect('created_by_id' in payloadDeActividad(form())).toBe(false)
  })
})
