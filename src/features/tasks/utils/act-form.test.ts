import { describe, it, expect } from 'vitest'
import { actividadAForm, hayCambios } from './act-form'
import { localDate } from '@/shared/utils'

const hoy = localDate()

describe('actividadAForm', () => {
  it('mapea todos los campos del formulario desde la actividad', () => {
    const a = {
      id: '1', titulo: 'Post Instagram', descripcion: 'd', empresa: 'EMC',
      responsables: [{ usuario_id: 'r', es_lider: true }], fecha_inicio: '2026-07-08', estado: 'En proceso',
      horas: 5, dias_produccion: 2, fecha_entrega: '2026-07-30',
      solicitante_id: 's', drive_url: 'https://drive.example/x',
    }
    expect(actividadAForm(a)).toEqual({
      titulo: 'Post Instagram', descripcion: 'd', empresa: 'EMC',
      responsables: [{ usuario_id: 'r', es_lider: true }], fecha_inicio: '2026-07-08', horas: '5', dias_produccion: '2',
      estado: 'En proceso', fecha_entrega: '2026-07-30',
      solicitante_id: 's', drive_url: 'https://drive.example/x',
    })
  })

  it('normaliza nulos y ausencias a cadenas vacías', () => {
    expect(actividadAForm({
      titulo: 'T', descripcion: null, empresa: 'EMC', responsables: null,
      fecha_inicio: null, estado: null, horas: null, dias_produccion: null,
      fecha_entrega: null, solicitante_id: null, drive_url: null,
    })).toEqual({
      titulo: 'T', descripcion: '', empresa: 'EMC', responsables: [],
      fecha_inicio: hoy, estado: 'Pendiente', horas: '', dias_produccion: '',
      fecha_entrega: '', solicitante_id: '', drive_url: '',
    })
  })

  it('una actividad sin fecha de inicio cae a hoy, no a un mes inventado', () => {
    expect(actividadAForm({ titulo: 'x' }).fecha_inicio).toBe(localDate())
  })

  it('respeta la fecha de una actividad existente, aunque sea de otro año', () => {
    expect(actividadAForm({ titulo: 'x', fecha_inicio: '2026-03-17' }).fecha_inicio).toBe('2026-03-17')
  })
})

describe('hayCambios', () => {
  const original = {
    id: '1', titulo: 'Post Instagram', descripcion: 'd', empresa: 'EMC',
    responsables: [{ usuario_id: 'r', es_lider: true }], fecha_inicio: '2026-07-08', estado: 'En proceso',
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

  it('detecta cambios de responsables sin depender del orden', () => {
    const otroOrden = { ...original, responsables: [{ usuario_id: 'r2', es_lider: false }, { usuario_id: 'r', es_lider: true }] }
    const base = { ...original, responsables: [{ usuario_id: 'r', es_lider: true }, { usuario_id: 'r2', es_lider: false }] }

    expect(hayCambios(actividadAForm(otroOrden), base)).toBe(false)
    expect(hayCambios({ ...actividadAForm(original), responsables: [] }, original)).toBe(true)
  })
})
