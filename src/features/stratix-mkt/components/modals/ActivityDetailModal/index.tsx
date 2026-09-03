'use client'
import { useState } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import Modal from '@/shared/components/ui/Modal'
import ConfirmModal from '@/shared/components/ui/ConfirmModal'
import { useStratix } from '@/features/stratix-mkt/components/StratixContext'
import { camposDeActividad, rastroDeActividad } from '@/features/stratix-mkt/utils/act-detail-fields'
import ActivityDetailHeader from '../ActivityDetailHeader'
import DetailGroup from '../DetailGroup'
// Los dos editores rápidos de la ficha (estado y fecha de entrega) están comentados abajo por
// pedido de Wagner el 25/08/2026: con el formulario de edición completo ya no hacían falta y
// dejaban dos caminos para el mismo dato. Estos imports vuelven con ellos.
// import { COLUMNAS_KANBAN } from '@/shared/context/AppContext'
// import { actividadesRepo } from '@/shared/data'
// import PillToggle from '@/shared/components/ui/PillToggle'
// import { limitesFecha } from '@/features/stratix-mkt/utils/gantt-rango'
import css from './index.module.css'

export default function ActivityDetailModal() {
  const { t, locale } = useT()
  const { miembrosPorId } = useApp()
  const { modalVerAct, setModalVerAct, abrirEdicion, eliminarAct } = useStratix()
  const [confirmarBorrado, setConfirmarBorrado] = useState(false)
  if (!modalVerAct) return null

  const deps = { t, locale, miembrosPorId }
  const grupos = camposDeActividad(modalVerAct, deps)

  // Quitados el 25/08/2026 por pedido de Wagner: el formulario de edición ya cubre estado y
  // fecha, y tener dos caminos para el mismo dato es lo que hace que uno de los dos se olvide.
  // Se comentan, no se borran (rules/proceso.md): restaurarlos es descomentar.
  // const limites = limitesFecha(new Date())
  //
  // async function cambiarEstado(col: string) {
  //   if (!modalVerAct.id) return
  //   const { error } = await actividadesRepo.updateEstado(modalVerAct.id, col)
  //   if (error) { mostrarMensaje('error', t('stratix.detail.statusError')); return }
  //   setActividades(prev => prev.map(a => (a.id === modalVerAct.id ? { ...a, estado: col } : a)))
  //   setModalVerAct(p => ({ ...p, estado: col }))
  //   mostrarMensaje('ok', t('stratix.detail.statusChanged', { estado: estadoLabel(col, t) }))
  // }
  //
  // async function cambiarFecha(fecha: string) {
  //   if (!fecha) return
  //   const { error } = await actividadesRepo.updateFecha(modalVerAct.id, fecha)
  //   if (error) { mostrarMensaje('error', t('stratix.detail.dueError')); return }
  //   setActividades(prev => prev.map(a => (a.id === modalVerAct.id ? { ...a, fecha_entrega: fecha } : a)))
  //   setModalVerAct(p => ({ ...p, fecha_entrega: fecha }))
  //   mostrarMensaje('ok', t('stratix.detail.dueChanged'))
  // }


  // El mismo ancho que `NewActivityModal`: es la misma tarea, leída y editada. Con 31.25 acá y 40
  // allá, darle a "Editar" ensanchaba el modal de golpe.
  return (
    <Modal
      anchoRem={40}
      onClose={() => setModalVerAct(null)}
      header={
        <ActivityDetailHeader
          act={modalVerAct}
          onEditar={() => abrirEdicion(modalVerAct)}
          onBorrar={() => setConfirmarBorrado(true)}
          onCerrar={() => setModalVerAct(null)}
        />
      }
    >
      {modalVerAct.descripcion && <div className={css.descripcion}>{modalVerAct.descripcion}</div>}

      {grupos.map(g => <DetailGroup key={g.titulo} grupo={g} />)}

      {/* Editores rápidos de estado y de fecha de entrega — comentados el 25/08/2026, ver la
          nota de arriba. El de fecha llevaba min/max de la MISMA ventana que usa el eje del
          Gantt, que es lo que impedía volver a cargar un año de tres dígitos.
      <div className={css.bloque}>
        <div className={css.rotulo}>{t('stratix.detail.changeStatus')}</div>
        <div className={css.estados}>
          {COLUMNAS_KANBAN.map(col => (
            <PillToggle key={col} size="sm" color={ESTADO_COLORS[col]} label={estadoLabel(col, t)}
              active={modalVerAct.estado === col}
              onClick={() => cambiarEstado(col)} />
          ))}
        </div>
      </div>

      <div className={css.bloque}>
        <div className={css.rotulo}>{t('stratix.detail.changeDue')}</div>
        <input
          type="date"
          className={css.fecha}
          value={modalVerAct.fecha_entrega || ''}
          min={limites.min}
          max={limites.max}
          onChange={e => cambiarFecha(e.target.value)}
        />
      </div>
      */}

      {modalVerAct.notas_jefe && (
        <div className={css.bloque}>
          <div className={css.rotulo}>{t('stratix.detail.bossNotes')}</div>
          <div className={css.descripcion}>{modalVerAct.notas_jefe}</div>
        </div>
      )}

      {modalVerAct.drive_url && (
        <a className={css.drive} href={modalVerAct.drive_url} target="_blank" rel="noreferrer">
          🔗 {t('stratix.detail.driveFolder')}
        </a>
      )}

      <div className={css.rastro}>{rastroDeActividad(modalVerAct, deps)}</div>

      {confirmarBorrado && (
        <ConfirmModal
          destructive
          title={t('stratix.detail.deleteTitle')}
          message={t('stratix.detail.deleteConfirm')}
          confirmLabel={t('common.delete')}
          onClose={() => setConfirmarBorrado(false)}
          onConfirm={() => eliminarAct(modalVerAct)}
        />
      )}
    </Modal>
  )
}
