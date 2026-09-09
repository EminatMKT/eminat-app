import { useState } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { estadoLabel } from '@/shared/constants/domain'
import { actividadesRepo } from '@/shared/data'
import { useT } from '@/shared/i18n'
import type { Actividad } from '@/features/tasks/types'

const SIN_ARRASTRE = { id: null, over: null }

export default function useKanban(actsKanban: Actividad[]) {
  const { actividades, setActividades, mostrarMensaje } = useApp()
  const { t } = useT()

  // Qué se arrastra y sobre qué columna: los dos nacen y mueren en el mismo gesto, así que
  // soltarlo es `setDrag(SIN_ARRASTRE)` y no dos setters que hay que acordarse de llamar.
  const [drag, setDrag] = useState<{ id: string | null; over: string | null }>(SIN_ARRASTRE)
  const { id: dragId, over: dragOver } = drag

  const porColumna = (col: string) => actsKanban.filter(a => a.estado === col)

  const onDragStart = (id: string) => setDrag({ id, over: null })
  const onDragOverCol = (over: string) => setDrag(p => ({ ...p, over }))
  const onDragEnd = () => setDrag(SIN_ARRASTRE)

  async function onDrop(col: string) {
    if (!dragId) return
    const act = actividades.find(a => a.id === dragId)
    if (!act || act.estado === col) { setDrag(SIN_ARRASTRE); return }
    const { error } = await actividadesRepo.updateEstado(dragId, col)
    if (!error) {
      setActividades(prev => prev.map(a => a.id === dragId ? { ...a, estado: col } : a))
      mostrarMensaje('ok', t('stratix.kanban.movedTo', { col: estadoLabel(col, t) }))
    } else {
      mostrarMensaje('error', t('stratix.kanban.moveError'))
    }
    setDrag(SIN_ARRASTRE)
  }

  const kanban = {
    actsKanban, porColumna,
    dragId, dragOver, onDragStart, onDragOverCol, onDragEnd, onDrop,
  }

  return kanban
}

// El tablero Kanban: el arrastrar-soltar que cambia el estado, y nada más.
//
// Tenía su PROPIO filtro de mes —un `<select>` de los meses con tareas, dibujado a mano en la
// barra de la sección— mientras el Dashboard filtraba por otro lado. Dos pestañas del mismo
// módulo podían estar mirando períodos distintos sin que nada lo dijera, y la de Production era
// la única sin los otros cinco filtros: no se podía ver el Kanban de una marca ni de una persona.
//
// Ahora el conjunto entra por parámetro, ya filtrado por el motor compartido, igual que
// `useReporte` recibe su `idsTeam` — quién filtra es UNA decisión y se toma en un solo lugar.
