import { distinctValues, type FilterDef } from '@/shared/utils'
import type { AdminUser } from '@/features/admin/types'

/** Los dos criterios del listado de usuarios. Es una FUNCIÓN porque el rótulo de un rol vive en
 *  la tabla `roles` y no en el código: los roles son dinámicos desde el 29/06/2026. */
const userFilters = (roleLabel: (rol: string) => string): FilterDef<AdminUser>[] => [
  { key: 'busqueda', labelKey: 'admin.searchUser', nameKey: 'common.search', kind: 'text',
    match: (u, v) => [u.nombre, u.apellido, u.email].some(x => (x ?? '').toLowerCase().includes(v.toLowerCase())) },
  // Sólo los roles CON gente: el catálogo tiene ocho y ofrecer uno que no filtra nada es ruido.
  // El que está elegido y se queda sin usuarios lo repone `ChipFilter` como huérfano.
  { key: 'rol', labelKey: 'admin.filterAll', nameKey: 'common.role', kind: 'chips',
    options: items => distinctValues(items, u => u.rol),
    optionLabel: roleLabel,
    match: (u, v) => u.rol === v },
]

export default userFilters
