'use client'
import type { ReactNode } from 'react'
import s from './index.module.css'

// centinela-exime: bloques-similares@2 — ES la unificación, no un bloque nuevo: sale de
// `ReunionRow` (el listado) y `ParticipanteRow` (la mesa), que repetían la misma caja —flex,
// borde, radio, fondo— y la misma barra de color al costado. La marca de `ReunionRow` decía
// "si aparece una segunda fila así, sube a shared"; apareció. `UserRow` (Admin) y `MemberCard`
// (Directorio) son las próximas, pero traen su dominio adentro: se migran cuando se las toque.
// centinela-exime: boton-a-mano@1 — no es una acción, es la SUPERFICIE: la fila entera es el
// botón para que abrirla funcione con el teclado. Con el estilo de `Button` sería un botón de
// barra puesto encima de una fila, no una fila.

// Lleva `children` y no la lista de lo que va adentro: QUÉ se muestra es del módulo, y un
// contenedor compartido que lo decide vuelve a ser el de quince props (rules/componentes.md).
// Lo compartido son la caja, la barra de color y el foco.
type Props = {
  /** Lo que identifica a la fila —la marca de la empresa, el rol en la mesa—. Entra como barra
   *  lateral y no tiñendo el texto: un color de catálogo no tiene contraste garantizado. */
  color: string
  /** Con esto la fila ENTERA es un botón. Sin esto es una fila que no navega a ningún lado,
   *  típicamente porque ya tiene sus propios controles adentro. */
  onAbrir?: () => void
  /** Qué abre, para un lector de pantalla. Sin esto, veinte filas suenan al mismo botón. */
  etiqueta?: string
  /** Modificador del módulo, para lo que sí es suyo: atenuar a un ausente, por ejemplo. */
  className?: string
  children: ReactNode
}

export default function FilaLista(props: Props) {
  const { color, onAbrir, etiqueta, className, children } = props
  const cuerpo = (
    <>
      <span className={s.barra} aria-hidden="true" />
      {children}
    </>
  )

  return (
    <li className={`${s.fila} ${className ?? ''}`} style={{ '--fila-color': color }}>
      {onAbrir
        ? <button type="button" className={`${s.caja} ${s.abrible}`} onClick={onAbrir} aria-label={etiqueta}>{cuerpo}</button>
        : <div className={s.caja}>{cuerpo}</div>}
    </li>
  )
}
