import { describe, it, expect } from 'vitest'
import type { Usuario } from '@/shared/context/loadAppData'
import type { Participante } from '@/features/reuniones/types'
import { internosDisponibles } from './index'

const usuarios: Usuario[] = [
  { id: 'u1', nombre: 'Freddy', apellido: 'Crespín', activo: true },
  { id: 'u2', nombre: 'Angie', apellido: 'Núñez', activo: true },
  { id: 'u3', nombre: 'Jonathan', apellido: 'Bula', activo: false },
  { id: 'u4', nombre: 'Solonombre', apellido: null, activo: true },
]

const enLaMesa = (usuarioId: string | null): Participante => ({
  id: `p-${usuarioId}`, reunion_id: 'r1', usuario_id: usuarioId,
  invitado_nombre: null, invitado_empresa: null, invitado_email: null,
  rol_en_reunion: 'participante', asistencia: 'presente',
})

describe('internosDisponibles', () => {
  it('ofrece a los activos que todavía no están en la mesa', () => {
    expect(internosDisponibles(usuarios, [enLaMesa('u1')])).toEqual([
      { id: 'u2', nombre: 'Angie Núñez' },
      { id: 'u4', nombre: 'Solonombre' },
    ])
  })

  // Ofrecerlo y que el UNIQUE lo rechace es peor que no ofrecerlo: el error no aporta nada
  // que el desplegable no pudiera haber evitado.
  it('no repite a nadie aunque la base también lo rechazaría', () => {
    const ids = internosDisponibles(usuarios, [enLaMesa('u1'), enLaMesa('u2')]).map(u => u.id)
    expect(ids).not.toContain('u1')
    expect(ids).not.toContain('u2')
  })

  // Un externo tiene `usuario_id` en NULL: no puede tapar a nadie del directorio.
  it('un invitado externo no saca a ningún interno de la lista', () => {
    expect(internosDisponibles(usuarios, [enLaMesa(null)])).toHaveLength(3)
  })

  it('deja afuera a los inactivos: la reunión es futura', () => {
    expect(internosDisponibles(usuarios, []).map(u => u.id)).not.toContain('u3')
  })
})
