'use client'
// centinela-exime: bloques-similares@3 — ES la unificación: `FilterPicker` y `FilterPresets`
// escribían el mismo desplegable en dos hojas distintas. El único menú de `ui/` es `RowMenu`, que
// va `position: fixed` calculado a mano porque vive en un contenedor con `overflow-x: auto`, y
// fija su contenido en vez de componer `children`.
import type { ReactNode } from 'react'
import s from './index.module.css'

type Props = {
  /** Lo que se lee en el disparador cerrado. */
  rotulo: string
  /** Punteado en vez de sólido: para el que OFRECE algo en vez de actuar sobre lo que ya está. */
  punteado?: boolean
  /** Cómo se llama el control cuando el rótulo es un ícono y no se puede leer. */
  ariaLabel?: string
  /** El rótulo es un ícono: sin caja, para que se vea igual que sus hermanos en una fila. */
  iconOnly?: boolean
  /** El panel cae hacia la izquierda. Para el disparador que vive contra el borde derecho: al
   *  revés, su panel se sale de la pantalla y los rótulos quedan cortados. */
  alignEnd?: boolean
  children: ReactNode
}

export default function Dropdown(props: Props) {
  const { rotulo, punteado = false, ariaLabel, iconOnly = false, alignEnd = false, children } = props
  const con = (base: string, aplica: boolean, mod: string) => `${base}${aplica ? ` ${mod}` : ''}`
  return (
    <details className={s.raiz}>
      <summary aria-label={ariaLabel}
        className={con(con(s.disparador, punteado, s.punteado), iconOnly, s.soloIcono)}>
        {rotulo}
      </summary>
      <div className={con(s.panel, alignEnd, s.aDerecha)}>{children}</div>
    </details>
  )
}

// Un desplegable: disparador y panel. Es `<details>` nativo y no un menú con estado — cierra con
// Escape, entra en el tab order y responde a Enter sin una línea de ARIA, y no agrega ni una
// dependencia ni un `useState` de apertura que después haya que cerrar al hacer click afuera.
// `RowMenu` escribe ese manejo a mano en sesenta líneas, y lo escribe porque su `fixed` no le
// deja otra.
