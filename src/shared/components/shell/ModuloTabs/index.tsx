'use client'
import AppShell from '../AppShell'
import { SUB_ITEMS, type PanelKey } from '../appShellConfig'
import { PageTransition } from '@/shared/motion'
import { soloDelCatalogo, esDelCatalogo } from '@/shared/utils'

type Props<T extends string> = {
  panel: PanelKey
  titulo: string
  tabs: readonly T[]
  activa: string
  onTab: (v: T) => void
  vistas: Record<string, JSX.Element>
  children?: React.ReactNode
}

// El título sigue a la SECCIÓN abierta, no al módulo, y sale de SUB_ITEMS para que el sidebar y
// el encabezado digan lo mismo siempre — incluso si mañana se renombra una sección.
const tituloDeSeccion = (panel: PanelKey, titulo: string, tab: string) => {
  const item = SUB_ITEMS[panel].find(i => (i.tabs ? i.tabs.includes(tab) : i.tab === tab))
  return item ? `${titulo} — ${item.label}` : titulo
}

// El cuerpo de un módulo con sub-vistas: el shell, el título de la sección y la vista abierta.
// `children` es lo que vive fuera de las tabs (los modales), no la lista de lo que va adentro.
export default function ModuloTabs<T extends string>(props: Props<T>) {
  const { panel, titulo, tabs, activa, onTab, vistas, children } = props

  // AppShell es compartido y emite un string cualquiera; el catálogo del módulo decide qué
  // entra. Sin esta frontera haría falta un `as T`, que no valida nada.
  const cambiarTab = soloDelCatalogo<T>(tabs, onTab)

  // La misma frontera para lo que ENTRA, con el guard que ya existe. `activa` sale de una
  // preferencia guardada y puede nombrar una sección que ya no existe —le pasa a cualquiera que
  // tuviera `kanban` guardado en `tab-stratix`—: acá se degrada a la primera en vez de renderizar
  // `undefined`, que es una pantalla en blanco sin ningún error.
  const tab: T = esDelCatalogo(tabs)(activa) ? activa : tabs[0]

  return (
    <AppShell title={tituloDeSeccion(panel, titulo, tab)} activeTab={tab} onTabChange={cambiarTab}>
      <PageTransition>
        <>
          {vistas[tab]}
          {children}
        </>
      </PageTransition>
    </AppShell>
  )
}
