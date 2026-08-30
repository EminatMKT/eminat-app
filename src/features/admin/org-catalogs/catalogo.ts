// centinela-exime: archivo-extenso@2 — es el catálogo organizacional: una entrada por catálogo
// y nada más. Partirlo dejaría tres catálogos en un archivo y tres en otro, que es exactamente
// lo que hace ilegible una tabla. Crece de a una entrada, no de a una función — los tipos y los
// helpers ya salieron a `types.ts` y `utils.ts`.

import type { CatalogDef, OrgCat } from './types'

// Única definición de los seis catálogos organizacionales. La consume tanto la UI
// (qué campos pinta el form) como la API (whitelist de columnas + qué bloquea el
// borrado), para que agregar un campo sea un solo cambio.
export const ORG_CATALOGS: Record<OrgCat, CatalogDef> = {
  // Empresa es el nivel más macro del organigrama (empresa › departamento ›
  // equipo › cargo). `codigo` es editable acá — a diferencia de los otros
  // catálogos se muestra al usuario, como chip corto en la tabla de personas.
  empresas: {
    labelKey: 'admin.org.empresas',
    newKey: 'admin.org.newEmpresa',
    fields: [
      { name: 'nombre', type: 'text', labelKey: 'admin.org.nombre', required: true },
      { name: 'codigo', type: 'text', labelKey: 'admin.org.codigo' },
      { name: 'color', type: 'color', labelKey: 'admin.org.color' },
      { name: 'activo', type: 'checkbox', labelKey: 'admin.org.activo', hintKey: 'admin.org.activoHint' },
      { name: 'recibe_actividades', type: 'checkbox', labelKey: 'admin.org.recibeActividades', hintKey: 'admin.org.recibeActividadesHint' },
    ],
    blockedBy: [
      { table: 'usuarios', column: 'empresa_id' },
      // Actividades referencia la clave natural, no el uuid: su FK es
      // actividades.empresa -> empresas.codigo. Sin `matchOn` este chequeo
      // compararía códigos contra un uuid, contaría 0 y dejaría intentar el
      // borrado. solicitudes y slots_calendario siguen con empresa_id a
      // propósito: están vacías y su migración quedó fuera de scope.
      { table: 'actividades', column: 'empresa', matchOn: 'codigo' },
      { table: 'solicitudes', column: 'empresa_id' },
      { table: 'slots_calendario', column: 'empresa_id' },
    ],
  },
  departamentos: {
    labelKey: 'admin.org.departamentos',
    newKey: 'admin.org.newDepartamento',
    fields: [
      { name: 'nombre', type: 'text', labelKey: 'admin.org.nombre', required: true },
      { name: 'color', type: 'color', labelKey: 'admin.org.color' },
      { name: 'icono', type: 'icon', labelKey: 'admin.org.icono' },
    ],
    blockedBy: [{ table: 'equipos', column: 'departamento_id' }],
  },
  equipos: {
    labelKey: 'admin.org.equipos',
    newKey: 'admin.org.newEquipo',
    fields: [
      { name: 'nombre', type: 'text', labelKey: 'admin.org.nombre', required: true },
      { name: 'departamento_id', type: 'select', labelKey: 'admin.org.departamento', required: true, options: 'departamentos' },
      { name: 'lider_id', type: 'select', labelKey: 'admin.org.lider', options: 'usuarios' },
    ],
    blockedBy: [{ table: 'usuarios', column: 'equipo_id' }],
  },
  cargos: {
    labelKey: 'admin.org.cargos',
    newKey: 'admin.org.newCargo',
    fields: [
      { name: 'nombre', type: 'text', labelKey: 'admin.org.nombre', required: true },
    ],
    blockedBy: [{ table: 'usuario_cargos', column: 'cargo_id' }],
  },
  // Jornada y vinculación son EJES DISTINTOS de la misma persona: se puede ser
  // staff a medio tiempo o pasante a tiempo completo. Por eso son dos catálogos
  // y no uno con un discriminador.
  jornadas: {
    labelKey: 'admin.org.jornadas',
    newKey: 'admin.org.newJornada',
    fields: [
      { name: 'nombre', type: 'text', labelKey: 'admin.org.nombre', required: true },
      { name: 'horas_dia', type: 'number', labelKey: 'admin.org.horasDia', required: true },
    ],
    blockedBy: [{ table: 'usuarios', column: 'jornada_id' }],
  },
  vinculaciones: {
    labelKey: 'admin.org.vinculaciones',
    newKey: 'admin.org.newVinculacion',
    fields: [
      { name: 'nombre', type: 'text', labelKey: 'admin.org.nombre', required: true },
    ],
    blockedBy: [{ table: 'usuarios', column: 'vinculacion_id' }],
  },
}

export const ORG_CATS = Object.keys(ORG_CATALOGS) as OrgCat[]
export const isOrgCat = (s: string): s is OrgCat => s in ORG_CATALOGS
