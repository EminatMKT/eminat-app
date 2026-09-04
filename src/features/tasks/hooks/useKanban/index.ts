import { useState } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { estadoLabel } from '@/shared/constants/domain'
import { actividadesRepo } from '@/shared/data'
import { useT } from '@/shared/i18n'
import { claveMes } from '@/features/tasks/utils/periodo'

// El tablero Kanban: su filtro de período y el arrastrar-soltar que cambia el estado.
export function useKanban() {
  const { actividades, setActividades, mostrarMensaje } = useApp()
  const { t } = useT()

  // centinela-exime: useState@1 — el filtro de período y el gesto de arrastre no se tocan: el
  // arrastre nace y muere en un drop, el período sobrevive a toda la sesión.
  const [periodoKanban, setPeriodoKanban] = useState('')
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)

  // Sólo los que TIENEN tareas, al revés que `periodosDisponibles()`: acá se salta a un mes cargado.
  const periodosConTareas = Array.from(new Set(actividades.map(a => claveMes(a.fecha_inicio)).filter(Boolean))).sort().reverse()
  const actsKanban = periodoKanban ? actividades.filter(a => claveMes(a.fecha_inicio) === periodoKanban) : actividades
  const porColumna = (col: string) => actsKanban.filter(a => a.estado === col)

  const onDragStart = (id: string) => setDragId(id)
  const onDragOverCol = (col: string) => setDragOver(col)
  const onDragEnd = () => { setDragId(null); setDragOver(null) }

  async function onDrop(col: string) {
    if (!dragId) return
    const act = actividades.find(a => a.id === dragId)
    if (!act || act.estado === col) { setDragId(null); setDragOver(null); return }
    const { error } = await actividadesRepo.updateEstado(dragId, col)
    if (!error) {
      setActividades(prev => prev.map(a => a.id === dragId ? { ...a, estado: col } : a))
      mostrarMensaje('ok', t('stratix.kanban.movedTo', { col: estadoLabel(col, t) }))
    } else {
      mostrarMensaje('error', t('stratix.kanban.moveError'))
    }
    setDragId(null)
    setDragOver(null)
  }

  const kanban = {
    periodoKanban, setPeriodoKanban, periodosConTareas, actsKanban, porColumna,
    dragId, dragOver, onDragStart, onDragOverCol, onDragEnd, onDrop,
  }

  return kanban
}
