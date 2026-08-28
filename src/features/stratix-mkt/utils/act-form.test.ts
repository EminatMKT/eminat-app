import { describe, it, expect } from 'vitest'
import { actividadAForm, hayCambios } from './act-form'
import { MESES } from '@/shared/context/AppContext'

const hoy = MESES[new Date().getMonth()]

describe('actividadAForm', () => {
  it('mapea todos los campos del formulario desde la actividad', () => {
    const a = {
      id: '1', titulo: 'Post Instagram', descripcion: 'd', empresa: 'EMC',
      responsable_id: 'r', mes: 'Julio', estado: 'En proceso',
      horas: 5, dias_produccion: 2, fecha_entrega: '2026-07-30',
      solicitante_id: 's', drive_url: 'https://drive.example/x',
    }
    expect(actividadAForm(a)).toEqual({
      titulo: 'Post Instagram', descripcion: 'd', empresa: 'EMC',
      responsable_id: 'r', mes: 'Julio', horas: '5', dias_produccion: '2',
      estado: 'En proceso', fecha_entrega: '2026-07-30',
      solicitante_id: 's', drive_url: 'https://drive.example/x',
    })
  })

  it('normaliza nulos y ausencias a cadenas vacías', () => {
    expect(actividadAForm({
      titulo: 'T', descripcion: null, empresa: 'EMC', responsable_id: null,
      mes: null, estado: null, horas: null, dias_produccion: null,
      fecha_entrega: null, solicitante_id: null, drive_url: null,
    })).toEqual({
      titulo: 'T', descripcion: '', empresa: 'EMC', responsable_id: '',
      mes: hoy, estado: 'Pendiente', horas: '', dias_produccion: '',
      fecha_entrega: '', solicitante_id: '', drive_url: '',
    })
  })

  it('un mes fuera del catálogo (dato legacy) cae al mes actual, no queda invisible en el select', () => {
    expect(actividadAForm({ titulo: 'T', mes: 'Agostoo' }).mes).toBe(hoy)
  })
})

describe('hayCambios', () => {
  const original = {
    id: '1', titulo: 'Post Instagram', descripcion: 'd', empresa: 'EMC',
    responsable_id: 'r', mes: 'Julio', estado: 'En proceso',
    horas: 5, dias_produccion: 2, fecha_entrega: '2026-07-30',
    solicitante_id: 's', drive_url: 'https://drive.example/x',
  }

  it('el formulario recién abierto no tiene cambios', () => {
    expect(hayCambios(actividadAForm(original), original)).toBe(false)
  })

  it('detecta un campo modificado', () => {
    expect(hayCambios({ ...actividadAForm(original), horas: '8' }, original)).toBe(true)
  })

  it('detecta un campo vaciado: limpiar es editar', () => {
    expect(hayCambios({ ...actividadAForm(original), drive_url: '' }, original)).toBe(true)
  })

  it('un espacio al final del título no es un cambio: el payload lo trimea', () => {
    expect(hayCambios({ ...actividadAForm(original), titulo: 'Post Instagram  ' }, original)).toBe(false)
  })
})
