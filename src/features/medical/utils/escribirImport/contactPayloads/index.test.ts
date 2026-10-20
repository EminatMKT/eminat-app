import { describe, it, expect } from 'vitest'
import type { PacienteContacto, PacienteFuente } from '@/features/medical/types'
import type { FuentePaciente } from '@/features/medical/constants'
import type { ContactoEntrante } from '@/features/medical/utils/pacienteImportPlan'
import payloadContactos from '.'

type FilaContacto = Omit<PacienteContacto, 'id' | 'created_at'>

function filaContacto(fuenteNombre: FuentePaciente, claveOrigen: string): FilaContacto {
  const fila: FilaContacto = {
    paciente_id: 'p1',
    tipo: 'telefono',
    valor: '305',
    fuente: fuenteNombre,
    clave_origen: claveOrigen,
  }
  return fila
}

describe('payloadContactos', () => {
  it("builds one row per (tipo, valor) with that member's own source", () => {
    const fuenteMiembro: Pick<PacienteFuente, 'fuente' | 'clave_origen' | 'nombre_origen' | 'ref_externa'> = {
      fuente: 'eclinpro',
      clave_origen: 'a',
      nombre_origen: null,
      ref_externa: null,
    }
    const contactos: ContactoEntrante[] = [{ tipo: 'telefono', valor: '305' }]
    const miembro = { fuente: fuenteMiembro, contactos, origenIndice: 0 }

    const rows = payloadContactos('p1', [miembro])

    expect(rows).toEqual([filaContacto('eclinpro', 'a')])
  })
})

describe('payloadContactos.dedupe', () => {
  it('drops an exact repeat of paciente_id+tipo+valor+fuente', () => {
    const row = filaContacto('eclinpro', 'a')
    const repetida = { ...row }
    expect(payloadContactos.dedupe([row, repetida])).toHaveLength(1)
  })

  it('keeps the same value reported from two different sources', () => {
    const a = filaContacto('eclinpro', 'a')
    const b = filaContacto('ecw', 'b')
    expect(payloadContactos.dedupe([a, b])).toHaveLength(2)
  })
})
