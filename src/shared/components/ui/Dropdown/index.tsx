'use client'
// centinela-exime: bloques-similares@2 — ES la unificación: `FilterPicker` y `FilterPresets`
// escribían el mismo desplegable, con la misma caja absoluta, borde, radio y sombra, en dos hojas
// distintas. Busqué en `ui/` antes: el único menú que hay es `RowMenu`, y responde a otra cosa —
// va `position: fixed` calculado a mano porque vive dentro de un contenedor con `overflow-x:auto`
// que recortaría un `absolute`, y fija su contenido (una lista de acciones) en vez de componer
// `children`. Unificarlos pediría un prop de estrategia de posicionamiento más dos modos de
// contenido, que es el componente de quince props que la propia regla advierte.
import type { ReactNode } from 'react'
import s from './index.module.css'

type Props = {
  /** Lo que se lee en el disparador cerrado. */
  rotulo: string
  /** Punteado en vez de sólido: para el que OFRECE algo en vez de actuar sobre lo que ya está. */
  punteado?: boolean
  children: ReactNode
}

// Un desplegable: disparador y panel. Es `<details>` nativo y no un menú con estado — cierra con
// Escape, entra en el tab order y responde a Enter sin una línea de ARIA, y no agrega ni una
// dependencia ni un `useState` de apertura que después haya que cerrar al hacer click afuera.
// `RowMenu` escribe ese manejo a mano en sesenta líneas, y lo escribe porque su `fixed` no le
// deja otra.
export default function Dropdown({ rotulo, punteado = false, children }: Props) {
  return (
    <details className={s.raiz}>
      <summary className={`${s.disparador}${punteado ? ` ${s.punteado}` : ''}`}>{rotulo}</summary>
      <div className={s.panel}>{children}</div>
    </details>
  )
}
