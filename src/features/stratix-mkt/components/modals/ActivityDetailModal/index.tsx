'use client'
import type { CSSProperties } from 'react'
import { useApp, COLUMNAS_KANBAN, mesATrimestre } from '@/shared/context/AppContext'
import { COLOR_MARCA_FALLBACK } from '@/shared/context/empresa-derivations'
import { ESTADO_COLORS, estadoLabel } from '@/shared/constants/domain'
import { actividadesRepo } from '@/shared/data'
import { useT } from '@/shared/i18n'
import Modal from '@/shared/components/Modal'
import PillToggle from '@/shared/components/ui/PillToggle'
import { useStratix } from '@/features/stratix-mkt/components/StratixContext'
import DetailField from '../DetailField'
import css from './index.module.css'

export default function ActivityDetailModal() {
  const { t, locale } = useT()
  const { setActividades, mostrarMensaje, miembrosPorId, colorMarca } = useApp()
  const { modalVerAct, setModalVerAct } = useStratix()
  if (!modalVerAct) return null

  const fields = [
    { label: t('stratix.col.assignee'), value: miembrosPorId[modalVerAct.responsable_id] ?? '—' },
    { label: t('stratix.detail.requestedBy'), value: miembrosPorId[modalVerAct.solicitante_id] ?? '—' },
    { label: t('stratix.col.month'), value: modalVerAct.mes },
    { label: t('stratix.detail.quarter'), value: modalVerAct.trimestre || mesATrimestre[modalVerAct.mes || 'Enero'] || 'Q1' },
    { label: t('stratix.detail.estHours'), value: `${modalVerAct.horas || 0}h` },
    { label: t('stratix.detail.prodDays'), value: modalVerAct.dias_produccion || '0' },
    {
      label: t('stratix.col.due'),
      value: modalVerAct.fecha_entrega
        ? new Date(modalVerAct.fecha_entrega + 'T00:00:00').toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'long' })
        : t('stratix.detail.noDate'),
    },
    { label: t('stratix.detail.verified'), value: modalVerAct.verificado ? `✓ ${t('common.yes')}` : `✕ ${t('common.no')}` },
  ]

  const vars = {
    '--marca': colorMarca[modalVerAct.empresa] ?? COLOR_MARCA_FALLBACK,
    '--estado': ESTADO_COLORS[modalVerAct.estado] || 'var(--c-t3)',
  } as CSSProperties

  return (
    <Modal width={500} onClose={() => setModalVerAct(null)}>
      {/* Encabezado propio y no el de Modal: acá el título va DEBAJO de los chips de marca y
          estado, que es lo primero que se mira al abrir una ficha. */}
      <div className={css.head} style={vars}>
        <div>
          <div className={css.chips}>
            <span className={css.chipMarca}>{modalVerAct.empresa}</span>
            <span className={css.chipEstado}>{estadoLabel(modalVerAct.estado, t)}</span>
          </div>
          <div className={css.titulo}>{modalVerAct.titulo}</div>
        </div>
        <button type="button" className={css.cerrar} onClick={() => setModalVerAct(null)}>✕</button>
      </div>

      {modalVerAct.descripcion && <div className={css.descripcion}>{modalVerAct.descripcion}</div>}

      <div className={css.campos}>
        {fields.map(f => <DetailField key={f.label} label={f.label} value={f.value} />)}
      </div>

      <div className={css.bloque}>
        <div className={css.rotulo}>{t('stratix.detail.changeStatus')}</div>
        <div className={css.estados}>
          {COLUMNAS_KANBAN.map(col => (
            <PillToggle key={col} size="sm" color={ESTADO_COLORS[col]} label={estadoLabel(col, t)}
              active={modalVerAct.estado === col}
              onClick={async () => {
                await actividadesRepo.updateEstado(modalVerAct.id, col)
                setActividades(prev => prev.map(a => (a.id === modalVerAct.id ? { ...a, estado: col } : a)))
                setModalVerAct(p => ({ ...p, estado: col }))
                mostrarMensaje('ok', t('stratix.detail.statusChanged', { estado: estadoLabel(col, t) }))
              }} />
          ))}
        </div>
      </div>

      {modalVerAct.drive_url && (
        <a className={css.drive} href={modalVerAct.drive_url} target="_blank" rel="noreferrer">
          🔗 {t('stratix.detail.driveFolder')}
        </a>
      )}
    </Modal>
  )
}
