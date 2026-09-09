import { DEPS_DIR } from '@/shared/constants/directorio'
import { SIN_FILTRO } from '@/shared/constants/domain'
import type { FilterDef } from '@/shared/utils'
import type { Member } from '../types'

const DEPARTAMENTOS = DEPS_DIR.filter(d => d !== SIN_FILTRO)

/** Los dos criterios del directorio, declarados una vez: de acá salen los controles y el
 *  predicado. El dominio de departamentos es cerrado —los de la empresa— y no los valores
 *  presentes: uno sin nadie tiene que verse en cero, no desaparecer. */
const MEMBER_FILTERS: FilterDef<Member>[] = [
  { key: 'busqueda', labelKey: 'dir.search', nameKey: 'dir.searchName', kind: 'text',
    match: (m, v) => [m.nombre, m.cargo, m.email].some(x => x.toLowerCase().includes(v.toLowerCase())) },
  { key: 'departamento', labelKey: 'dir.allDepartments', nameKey: 'dir.department', kind: 'chips',
    options: () => DEPARTAMENTOS, match: (m, v) => m.departamento === v },
]

export default MEMBER_FILTERS
