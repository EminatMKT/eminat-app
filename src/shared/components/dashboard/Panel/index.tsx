'use client'
import { useUserPreference } from '@/shared/hooks'
import { Disclosure } from '@/shared/components/ui'
import type { PanelProps } from './types'
import s from './index.module.css'

// centinela-exime: bloques-similares@3 — busqué los 19 componentes de `ui/` y los de
// `dashboard/`: ninguno es un contenedor de sección, y el chevron que compartía con `StatCard`
// acaba de salir a `Disclosure`. Éste ES el contenedor al que los demás llaman.

/** El contenedor de los bloques de un módulo: gráficas, tablas, la barra de filtros. */
export default function Panel({ title, right, children, flush = false, collapsible = false, persistKey }: PanelProps) {
  // Va SÍNCRONO a propósito: desde la base el panel se pintaría abierto y se cerraría solo al
  // llegar la respuesta.
  const [collapsed, setCollapsed] = useUserPreference(persistKey ? `panel-${persistKey}` : null, false)
  const rotulo = <span className={s.rotulo}>{title}</span>
  return (
    <div className={`${s.raiz}${flush ? ` ${s.recortado}` : ''}`}>
      {title && (
        <div className={`${s.cabecera}${collapsed ? ` ${s.cabeceraSola}` : ''}`}>
          {collapsible
            ? <Disclosure abierto={!collapsed} onAlternar={() => setCollapsed(c => !c)}>{rotulo}</Disclosure>
            : rotulo}
          {/* Envuelto: sin esto, un `right` de varias piezas las reparte el `space-between` de la
              cabecera y quedan desperdigadas entre el título y el borde. */}
          {right && <div className={s.derecha}>{right}</div>}
        </div>
      )}
      {!collapsed && <div className={flush ? s.cuerpoAlBorde : s.cuerpo}>{children}</div>}
    </div>
  )
}

// Un solo contenedor para todos los bloques de un módulo: antes cada uno repetía su borde, su
// radio y su sombra, y su título con otro tamaño. Con uno solo el módulo respira igual y el ojo
// encuentra el título siempre en el mismo lugar. `right` acompaña al título (contadores,
// acciones); `collapsible` deja recoger el bloque para mostrar una sección a la vez.
//
// Sin `collapsible` el título NO es un botón: antes se dibujaba uno igual con el `onClick`
// desactivado por dentro, y eso lo dejaba en el tab order prometiendo algo que no hacía.
//
// El recorte de `flush` es lo único condicional: ahí el contenido llega al borde y sin
// `overflow: hidden` las esquinas de una tabla se salen del radio. Con padding no recorta nada
// propio y sí lo ajeno — un desplegable que cae de la fila de filtros quedaba tapado por el borde.
