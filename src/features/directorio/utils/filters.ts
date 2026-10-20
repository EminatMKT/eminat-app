import type { FilterDef } from '@/shared/utils'
import type { Member } from '../types'

const options = (items: Member[], field: keyof Member) =>
  Array.from(new Set(items.map(item => item[field]).filter(Boolean).map(String))).sort()

const MEMBER_FILTERS: FilterDef<Member>[] = [
  { key: 'busqueda', labelKey: 'dir.search', nameKey: 'dir.searchName', kind: 'text',
    match: (m, value) => [m.nombre, m.email, m.cargo].some(text => text.toLocaleLowerCase().includes(value.toLocaleLowerCase())) },
  { key: 'empresa', labelKey: 'common.company', nameKey: 'common.company', kind: 'select',
    options: items => options(items, 'empresa'), match: (m, value) => m.empresa === value },
  { key: 'departamento', labelKey: 'dir.allDepartments', nameKey: 'dir.department', kind: 'select',
    options: items => options(items, 'departamento'), match: (m, value) => m.departamento === value },
  { key: 'cargo', labelKey: 'common.role', nameKey: 'common.role', kind: 'select',
    options: items => options(items, 'cargo'), match: (m, value) => m.cargo === value },
]

export default MEMBER_FILTERS
