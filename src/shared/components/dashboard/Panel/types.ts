import type { ReactNode } from 'react'

type PanelBase = {
  title?: string
  right?: ReactNode
  children: ReactNode
  flush?: boolean // el contenido llega hasta el borde (tablas), sin padding propio
}

/** Plegable ⇒ `persistKey` OBLIGATORIO: uno que se recoge y se reabre solo al recargar es una
 *  molestia silenciosa. La clave no sale del título, que está traducido y cambiaría con el idioma. */
export type PanelProps = PanelBase & (
  | { collapsible: true; persistKey: string }
  | { collapsible?: false; persistKey?: never }
)
