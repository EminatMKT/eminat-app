import { describe, it, expect } from 'vitest'
import filtrarTemas from './index'
import type { Tema } from '@/features/reuniones/types'

const tema = (titulo: string, empresa = 'EMC'): Tema => ({
  id: titulo, empresa, titulo, activo: true, creado_por_id: null, created_at: null,
})

const TEMAS = [tema('Presupuesto Q4'), tema('Presupuesto Q4', 'SVN'), tema('Contrataciones')]

describe('filtrarTemas', () => {
  it('sin búsqueda devuelve todo', () => {
    expect(filtrarTemas(TEMAS, '')).toHaveLength(3)
  })

  it('ignora mayúsculas y espacios de sobra', () => {
    expect(filtrarTemas(TEMAS, '  PRESUPUESTO ')).toHaveLength(2)
  })

  // Dos empresas pueden tener el MISMO título a propósito: el UNIQUE es por empresa. Buscar por
  // el código de la empresa es la única forma de distinguirlos en una lista.
  it('busca también por el código de la empresa', () => {
    expect(filtrarTemas(TEMAS, 'svn').map(t => t.empresa)).toEqual(['SVN'])
  })

  it('no encuentra lo que no está', () => {
    expect(filtrarTemas(TEMAS, 'nómina')).toEqual([])
  })
})
