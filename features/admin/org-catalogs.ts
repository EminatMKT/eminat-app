import type { I18nKey } from '@/shared/i18n'
import type { OrgRow, Usuario } from '@/shared/context/loadAppData'

// Única definición de los tres catálogos organizacionales. La consume tanto la UI
// (qué campos pinta el form) como la API (whitelist de columnas + qué bloquea el
// borrado), para que agregar un campo sea un solo cambio.

export type OrgCat = 'empresas' | 'departamentos' | 'equipos' | 'cargos'

export type OrgField = {
  /** Columna de la fila canónica OrgRow — el form no puede inventar campos. */
  name: keyof OrgRow
  type: 'text' | 'color' | 'icon' | 'select'
  labelKey: I18nKey
  required?: boolean
  /** Fuente de opciones del select (catálogo del contexto). */
  options?: 'departamentos' | 'usuarios'
}

export type CatalogDef = {
  labelKey: I18nKey
  fields: OrgField[]
  /** Dependientes que bloquean el borrado (patrón Roles: bloquear + avisar). */
  blockedBy: { table: string; column: string }[]
}

export const ORG_CATALOGS: Record<OrgCat, CatalogDef> = {
  // Empresa es el nivel más macro del organigrama (empresa › departamento ›
  // equipo › cargo). `codigo` es editable acá — a diferencia de los otros
  // catálogos se muestra al usuario, como chip corto en la tabla de personas.
  empresas: {
    labelKey: 'admin.org.empresas',
    fields: [
      { name: 'nombre', type: 'text', labelKey: 'admin.org.nombre', required: true },
      { name: 'codigo', type: 'text', labelKey: 'admin.org.codigo' },
      { name: 'color', type: 'color', labelKey: 'admin.org.color' },
    ],
    blockedBy: [
      { table: 'usuarios', column: 'empresa_id' },
      { table: 'actividades', column: 'empresa_id' },
      { table: 'solicitudes', column: 'empresa_id' },
      { table: 'slots_calendario', column: 'empresa_id' },
    ],
  },
  departamentos: {
    labelKey: 'admin.org.departamentos',
    fields: [
      { name: 'nombre', type: 'text', labelKey: 'admin.org.nombre', required: true },
      { name: 'color', type: 'color', labelKey: 'admin.org.color' },
      { name: 'icono', type: 'icon', labelKey: 'admin.org.icono' },
    ],
    blockedBy: [{ table: 'equipos', column: 'departamento_id' }],
  },
  equipos: {
    labelKey: 'admin.org.equipos',
    fields: [
      { name: 'nombre', type: 'text', labelKey: 'admin.org.nombre', required: true },
      { name: 'departamento_id', type: 'select', labelKey: 'admin.org.departamento', required: true, options: 'departamentos' },
      { name: 'lider_id', type: 'select', labelKey: 'admin.org.lider', options: 'usuarios' },
    ],
    blockedBy: [{ table: 'usuarios', column: 'equipo_id' }],
  },
  cargos: {
    labelKey: 'admin.org.cargos',
    fields: [
      { name: 'nombre', type: 'text', labelKey: 'admin.org.nombre', required: true },
    ],
    blockedBy: [{ table: 'usuario_cargos', column: 'cargo_id' }],
  },
}

export const ORG_CATS = Object.keys(ORG_CATALOGS) as OrgCat[]
export const isOrgCat = (s: string): s is OrgCat => s in ORG_CATALOGS

// Las tres tablas tienen `codigo` UNIQUE NOT NULL pero no es dato de negocio:
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
