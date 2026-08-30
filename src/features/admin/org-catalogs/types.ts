import type { I18nKey } from '@/shared/i18n'
import type { OrgRow } from '@/shared/context/loadAppData'

export type OrgCat = 'empresas' | 'departamentos' | 'equipos' | 'cargos' | 'jornadas' | 'vinculaciones'

export type OrgField = {
  /** Columna de la fila canónica OrgRow — el form no puede inventar campos. */
  name: keyof OrgRow
  type: 'text' | 'number' | 'color' | 'icon' | 'select' | 'checkbox'
  labelKey: I18nKey
  /** Aclaración al lado del label, para campos cuyo efecto no es obvio por el
   *  nombre. Se declara acá y no en el form: el renderer sirve a los 6 catálogos
   *  y no debe conocer el nombre de ningún campo en particular. */
  hintKey?: I18nKey
  required?: boolean
  /** Fuente de opciones del select (catálogo del contexto). */
  options?: 'departamentos' | 'usuarios'
}

export type CatalogDef = {
  labelKey: I18nKey
  /** Etiqueta del botón de alta, en singular ("Nueva empresa"). Va por catálogo
   *  y no compuesta, porque el género cambia con el sustantivo. */
  newKey: I18nKey
  fields: OrgField[]
  /** Dependientes que bloquean el borrado (patrón Roles: bloquear + avisar).
   *  `matchOn` dice contra qué valor de la fila compara la columna dependiente:
   *  'id' para las FK por uuid, 'codigo' para las que apuntan a la clave natural
   *  (actividades.empresa -> empresas.codigo). Default 'id'. */
  blockedBy: { table: string; column: string; matchOn?: 'id' | 'codigo' }[]
}
