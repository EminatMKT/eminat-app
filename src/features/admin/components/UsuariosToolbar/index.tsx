'use client'
import type { ReactNode } from 'react'
import { ListToolbar } from '@/shared/components/ui'
import { ChipFilter } from '@/shared/components/filters'
import type { FilterDef, FilterValues } from '@/shared/utils'
import type { AdminUser } from '@/features/admin/types'

type Props = {
  defs: FilterDef<AdminUser>[]
  items: AdminUser[]
  values: FilterValues
  onChange: (key: string, value: string) => void
  action?: ReactNode
}

export default function UsuariosToolbar(props: Props) {
  const { defs, items, values, onChange, action } = props
  const [search, role] = defs
  return (
    <ListToolbar scroll action={action} placeholderKey={search.labelKey}
      busqueda={values[search.key] ?? ''} setBusqueda={v => onChange(search.key, v)}>
      <ChipFilter def={role} items={items} value={values[role.key] ?? ''}
        onChange={v => onChange(role.key, v)} />
    </ListToolbar>
  )
}

// El encabezado del listado de usuarios: buscador, roles y el alta. No dibuja nada propio — es
// `ListToolbar` con los roles adentro, en modo riel para que ocho píldoras no empujen el alta a
// un segundo renglón.
//
// Se llamaba `RoleFilterBar` y dibujaba su propio botón (`RoleChip`), decidía a mano qué roles
// ofrecer y leía el contexto para saberlo. Las tres cosas salen ahora del def: el nombre viejo
// prometía un filtro de roles y esto es el encabezado entero.
