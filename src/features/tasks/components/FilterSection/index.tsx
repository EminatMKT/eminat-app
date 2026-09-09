'use client'
import { useApp } from '@/shared/context/AppContext'
import { FiltersPanel } from '@/shared/components/filters'
import { useTasks } from '@/features/tasks/components/TasksContext'

type Props = {
  /** Con qué clave recuerda ESTA vista si el panel quedó recogido. Es lo único propio de cada
   *  pestaña: los valores, las vistas y qué filtros se ven son del módulo y se comparten. */
  persistKey: string
}

export default function FilterSection({ persistKey }: Props) {
  const { actividades } = useApp()
  const { filtros } = useTasks()
  return <FiltersPanel filtros={filtros} items={actividades} persistKey={persistKey} />
}

// El panel de filtros del módulo, cableado una sola vez. Las dos pestañas que lo montan
// —Dashboard y Production— leían por su cuenta el mismo `filtros` del contexto y los mismos
// `actividades` sin filtrar: la línea que hay que acordarse de cambiar en dos lados el día que el
// panel pida un dato más.
//
// `items` son TODOS y no los filtrados: de ahí salen las opciones de cada desplegable, y con los
// filtrados, al elegir una marca desaparecerían las demás.
