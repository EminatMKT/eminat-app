import type { OrgRow, Usuario } from '@/shared/context/loadAppData'
import type { OrgCat } from './types'
import { ORG_CATALOGS } from './catalogo'

// Todas las tablas tienen `codigo` UNIQUE NOT NULL pero no es dato de negocio:
// se deriva del nombre (mismo criterio que validateNewRole con los roles) y queda
// fijo aunque después renombren — la unicidad la garantiza el UNIQUE de la DB.
export function codigoFrom(nombre: string): string {
  const base = nombre
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // diacríticos
    .toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 24)
  return base || 'ITEM'
}

// Toma del body solo las columnas declaradas por el catálogo (whitelist); '' en un
// select (opción "sin asignar") se guarda como NULL, no como string vacío.
// Vive acá y no en el route porque Next solo admite handlers HTTP como exports.
export function pickFields(cat: OrgCat, body: Partial<OrgRow>): Partial<OrgRow> {
  const row: Partial<OrgRow> = {}
  for (const f of ORG_CATALOGS[cat].fields) {
    const v = body[f.name]
    if (v === undefined) continue
    Object.assign(row, { [f.name]: v === '' ? null : v })
  }
  return row
}

export const dupError = (err: { code?: string; message: string }) =>
  err.code === '23505' ? 'Ya existe una entrada con ese nombre.' : err.message

// Lectores del embed N:N `usuario_cargos`. Toman solo esa parte de la fila
// canónica (Pick) para servir a cualquier vista que traiga el embed.
type ConCargos = Pick<Usuario, 'usuario_cargos'>

export const cargoIdsOf = (u: ConCargos): string[] =>
  (u.usuario_cargos || []).flatMap(uc => (uc.cargo_id ? [uc.cargo_id] : []))

export const cargoNamesOf = (u: ConCargos): string[] =>
  (u.usuario_cargos || []).flatMap(uc => (uc.cargos?.nombre ? [uc.cargos.nombre] : []))
