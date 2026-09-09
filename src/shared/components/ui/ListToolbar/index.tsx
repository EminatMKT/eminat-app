'use client'
import type { ReactNode } from 'react'
import { useT, type I18nKey } from '@/shared/i18n'
import s from './index.module.css'

type Props = {
  busqueda: string
  setBusqueda: (v: string) => void
  action?: ReactNode
  /** Filtros extra (chips). Ocupan el espacio libre entre el buscador y la acción. */
  children?: ReactNode
  /** Los filtros se scrollean en lugar de envolver: ocho roles no pueden empujar el alta a un
   *  segundo renglón. En el Directorio, envolver está bien. */
  scroll?: boolean
  /** Qué se busca, cuando «Buscar» no alcanza: sin decir que mira también el email, la gente lo
   *  escribe y cree que la lista no lo encuentra. */
  placeholderKey?: I18nKey
}

// centinela-exime: bloques-similares@3 — la otra fila de encabezado del repo es `FilterBar`, y
// comparten cuatro declaraciones de flex y nada más: acá hay buscador y acción, allá un control
// por def, y hasta el gap difiere.

/** El encabezado de una lista: buscador, filtros y la acción de alta. */
export default function ListToolbar(props: Props) {
  const { busqueda, setBusqueda, action, children, placeholderKey = 'common.search', scroll } = props
  const { t } = useT()
  return (
    <div className={s.fila}>
      <input type="text" placeholder={t(placeholderKey)} value={busqueda} className={s.busqueda}
        onChange={e => setBusqueda(e.target.value)} />
      {/* Los filtros en su propia caja: sueltos heredaban el gap de la fila, y dos chips se
          leían como dos controles sin relación. */}
      {children && <div className={scroll ? `${s.filtros} ${s.riel}` : s.filtros}>{children}</div>}
      <div className={s.accion}>{action}</div>
    </div>
  )
}

// Encabezado común de las listas: antes cada vista lo resolvía por su cuenta —Usuarios tenía el
// buscador y el botón en filas distintas, Roles y los catálogos no tenían buscador—.
//
// Ya no lee el contexto: pedía `useApp()` para un solo objeto de estilo, y eso volvía imposible
// montar un componente de presentación fuera del provider por una cuestión de padding.
