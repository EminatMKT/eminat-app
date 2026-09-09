'use client'
// centinela-exime: bloques-similares@3 — ES la unificación: `FilterPicker` y `FilterPresets`
// escribían el mismo desplegable en dos hojas distintas. El único menú de `ui/` es `RowMenu`, que
// va `position: fixed` calculado a mano porque vive en un contenedor con `overflow-x: auto`, y
// fija su contenido en vez de componer `children`.
import { useEffect, useRef, type ReactNode } from 'react'
import s from './index.module.css'

const ESCAPE = 'Escape'
const POINTER_DOWN = 'pointerdown'
const KEY_DOWN = 'keydown'

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
  const raiz = useRef<HTMLDetailsElement>(null)
  const con = (base: string, aplica: boolean, mod: string) => `${base}${aplica ? ` ${mod}` : ''}`

  useEffect(() => {
    // `pointerdown` y no `click`: cierra antes de que el clic aterrice, así apretar el disparador
    // de OTRO desplegable lo abre en el mismo gesto en vez de gastarlo en cerrar éste.
    const afuera = (e: PointerEvent) => {
      const el = raiz.current
      if (el?.open && !el.contains(e.target as Node)) el.open = false
    }
    const escape = (e: KeyboardEvent) => {
      if (e.key === ESCAPE && raiz.current?.open) raiz.current.open = false
    }
    document.addEventListener(POINTER_DOWN, afuera)
    document.addEventListener(KEY_DOWN, escape)
    return () => {
      document.removeEventListener(POINTER_DOWN, afuera)
      document.removeEventListener(KEY_DOWN, escape)
    }
  }, [])

  return (
    <details className={s.raiz} ref={raiz}>
      <summary aria-label={ariaLabel}
        className={con(con(s.disparador, punteado, s.punteado), iconOnly, s.soloIcono)}>
        {rotulo}
      </summary>
      <div className={con(s.panel, alignEnd, s.aDerecha)}>{children}</div>
    </details>
  )
}

// Un desplegable: disparador y panel. Es `<details>` nativo y no un menú con estado — el abierto/
// cerrado, el tab order y el Enter salen del navegador, sin una línea de ARIA ni un `useState` de
// apertura que mantener en sincronía con el DOM.
//
// Lo que `<details>` NO da es el descarte liviano: queda abierto para siempre hasta que alguien
// vuelva a apretar el disparador, y un menú que no se cierra al clickear afuera se lee como roto.
// Eso son los dos listeners de arriba, que tocan `el.open` directo en vez de duplicar el estado en
// React — el DOM ya lo tiene, y una segunda copia sólo puede desincronizarse. `RowMenu` escribe
// este manejo a mano en sesenta líneas, y lo escribe porque su `fixed` no le deja otra.
//
// Van en `document` porque un clic AFUERA no lo escucha nada de adentro: es eso, un backdrop que
// se come el clic, o un `focusout` que no dispara cuando se aprieta el fondo de la página.
//
// ponytail: un par de listeners por instancia. Con dos o tres desplegables por barra no se mide;
// si alguno entra en una fila de tabla, la salida es el atributo nativo `popover`, que da descarte
// liviano y Escape sin JS. Hoy no sirve: el popover va al top layer y el panel deja de anclarse a
// su disparador sin CSS anchor positioning, que todavía es sólo Chrome y Edge.
