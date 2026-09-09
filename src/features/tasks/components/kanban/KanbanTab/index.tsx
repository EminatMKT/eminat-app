'use client'
import { COLUMNAS_KANBAN } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import { Button } from '@/shared/components/ui'
import { useTasks } from '@/features/tasks/components/TasksContext'
import FilterSection from '@/features/tasks/components/FilterSection'
import KanbanColumn from '../KanbanColumn'
import s from './index.module.css'
import { ESTADO } from '@/shared/constants/domain'

export default function KanbanTab() {
  const { t } = useT()
  const { actsKanban, setNuevaAct, setModalNuevaAct } = useTasks()

  // Una tarea nueva desde Production nace pendiente: es la columna donde se la va a buscar.
  const nuevaPendiente = () => {
    setNuevaAct(p => ({ ...p, estado: ESTADO.PENDIENTE }))
    setModalNuevaAct(true)
  }

  return (
    <div>
      {/* Los mismos filtros que el Dashboard y con el mismo estado: filtrar acá filtra allá, que
          es lo que evita que dos pestañas del módulo miren períodos distintos. */}
      <FilterSection persistKey="tasks-kanban-filtros" />
      {/* La barra de la sección: el conteo a la izquierda y el alta a la derecha. El alta vivía
          en el topbar, que es del shell y no de esta vista (ver rules/ui.md). */}
      <div className={s.bar}>
        <div className={s.hint}>{t('stratix.kanbanHint', { n: actsKanban.length })}</div>
        <div className={s.tools}>
          <Button kind="new" label={t('stratix.newTask')} onClick={nuevaPendiente} />
        </div>
      </div>
      <div className={s.board}>
        {COLUMNAS_KANBAN.map(col => (
          <KanbanColumn key={col} col={col} />
        ))}
      </div>
    </div>
  )
}

// Production: las cuatro columnas de estado y lo que opera sobre ellas.
//
// Tenía un `<select>` de mes propio, dibujado a mano con su borde en hexadecimal, y era la única
// de las cuatro secciones sin los otros filtros: no se podía ver el tablero de una marca ni de
// una persona, que es lo primero que se le pide a un Kanban de equipo. Ahora monta el panel
// compartido y lee el mismo conjunto filtrado que el Dashboard.
//
// El filtro de `estado` se sigue ofreciendo aunque el tablero YA sea el eje de estados: con uno
// puesto quedan tres columnas vacías, que se ve raro pero no está mal —«mostrame sólo lo que
// está en proceso» es una pregunta legítima— y quien no lo quiera lo esconde desde el
// «+ Filtro». Que una pestaña declare con qué subconjunto de defs filtra es una pieza que al
// motor le falta, y está anotada.
