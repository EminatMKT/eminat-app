import { useState } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { estadoLabel } from '@/shared/constants/domain'
import { actividadesRepo } from '@/shared/data'
import { useT } from '@/shared/i18n'

// El tablero Kanban: su filtro de mes y el arrastrar-soltar que cambia el estado.
export function useKanban() {
  const { actividades, setActividades, mostrarMensaje } = useApp()
  const { t } = useT()

  // centinela-exime: useState@1 — el filtro de mes y el gesto de arrastre no se tocan: el
  // arrastre nace y muere en un drop, el mes sobrevive a toda la sesión.
  const [mesKanban, setMesKanban] = useState('')
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)

  const mesesDisponibles = actividades.map(a => a.mes).filter(Boolean).filter((m, i, arr) => arr.indexOf(m) === i)
  const actsKanban = mesKanban ? actividades.filter(a => a.mes === mesKanban) : actividades
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
    mesKanban, setMesKanban, mesesDisponibles, actsKanban, porColumna,
    dragId, dragOver, onDragStart, onDragOverCol, onDragEnd, onDrop,
  }

  return kanban
}
