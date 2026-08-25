'use client'
import { useEffect } from 'react'
import { useApp, MESES, COLUMNAS_KANBAN } from '@/shared/context/AppContext'
import { estadoLabel } from '@/shared/constants/domain'
import { useT } from '@/shared/i18n'
import Modal from '@/shared/components/ui/Modal'
import Field from '@/shared/components/ui/Field'
import { useStratix } from '@/features/stratix-mkt/components/StratixContext'
import { limitesFecha } from '@/features/stratix-mkt/utils/gantt-rango'
import s from './index.module.css'

export default function NewActivityModal() {
  const { miembrosAsignables, marcas, usuarios } = useApp()
  const { t } = useT()
  const { modalNuevaAct, nuevaAct, setNuevaAct, creandoAct, crearActividad, actEditando, cerrarFormAct } = useStratix()

  // El form arranca con valores por defecto fijos, pero las dos listas son dinámicas: si el
  // default ya no está entre las opciones —el admin desmarcó esa empresa, esa persona dejó el
  // equipo— el navegador muestra la primera opción mientras el estado conserva el valor viejo,
  // y se guardaría el que no se ve. Sincronizar el estado con lo que el select realmente
  // muestra cierra ese hueco.
  useEffect(() => {
    if (marcas.length && !marcas.some(m => m.codigo === nuevaAct.empresa)) {
      setNuevaAct(p => ({ ...p, empresa: marcas[0].codigo }))
    }
  }, [marcas, nuevaAct.empresa, setNuevaAct])

  // Antes acá se preseleccionaba `miembrosAsignables[0]`. Se quitó a propósito: el responsable
  // de una tarea es una decisión, no un default — quien no bajaba la vista se la asignaba al
  // primero de la lista sin enterarse.

  const limites = limitesFecha(new Date())

  if (!modalNuevaAct) return null
  const sinTitulo = !nuevaAct.titulo.trim()

  return (
    <Modal width={520} onClose={cerrarFormAct}>
      <div className={s.head}>
        <div>
          <div className={s.titulo}>{actEditando ? t('stratix.edit.title') : t('stratix.new.title')}</div>
          <div className={s.sub}>{actEditando ? t('stratix.edit.sub') : t('stratix.new.sub')}</div>
        </div>
        <button type="button" className={s.cerrar} onClick={cerrarFormAct}>✕</button>
      </div>

      <Field grande required label={t('stratix.new.taskTitle')}>
        <input type="text" autoFocus value={nuevaAct.titulo} placeholder={t('stratix.new.titlePh')}
          onChange={e => setNuevaAct(p => ({ ...p, titulo: e.target.value }))} />
      </Field>

      <Field label={t('stratix.new.desc')}>
        <textarea rows={3} value={nuevaAct.descripcion} placeholder={t('stratix.new.descPh')}
          onChange={e => setNuevaAct(p => ({ ...p, descripcion: e.target.value }))} />
      </Field>

      <div className={s.dos}>
        {/* Los dos placeholders son obligatorios: sin ellos el navegador pinta la primera
            opción mientras el estado sigue vacío, y se guarda lo que no se ve (ver ui.md). */}
        <Field required label={t('stratix.new.brand')}>
          <select value={nuevaAct.empresa} onChange={e => setNuevaAct(p => ({ ...p, empresa: e.target.value }))}>
            <option value="">{t('stratix.new.select')}</option>
            {marcas.map(m => <option key={m.codigo} value={m.codigo}>{m.codigo} — {m.nombre}</option>)}
          </select>
        </Field>
        <Field required label={t('stratix.new.assignee')}>
          <select value={nuevaAct.responsable_id} onChange={e => setNuevaAct(p => ({ ...p, responsable_id: e.target.value }))}>
            <option value="">{t('stratix.new.select')}</option>
            {miembrosAsignables.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </select>
        </Field>
      </div>

      <Field label={t('stratix.new.requestedBy')}>
        <select value={nuevaAct.solicitante_id} onChange={e => setNuevaAct(p => ({ ...p, solicitante_id: e.target.value }))}>
          <option value="">—</option>
          {usuarios.filter(u => !u.activo && u.id === nuevaAct.solicitante_id).map(u => (
            <option key={u.id} value={u.id as string} disabled>{`${u.nombre || ''} ${u.apellido || ''}`.trim()} ({t('stratix.new.inactive')})</option>
          ))}
          {usuarios.filter(u => u.activo && u.id).map(u => (
            <option key={u.id} value={u.id as string}>{`${u.nombre || ''} ${u.apellido || ''}`.trim()}</option>
          ))}
        </select>
      </Field>

      <div className={s.tres}>
        <Field label={t('stratix.new.month')}>
          <select value={nuevaAct.mes} onChange={e => setNuevaAct(p => ({ ...p, mes: e.target.value }))}>
            {MESES.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </Field>
        <Field label={t('stratix.new.hours')}>
          <input type="number" min="0" placeholder="0" value={nuevaAct.horas}
            onChange={e => setNuevaAct(p => ({ ...p, horas: e.target.value }))} />
        </Field>
        <Field label={t('stratix.new.days')}>
          <input type="number" min="0" placeholder="0" value={nuevaAct.dias_produccion}
            onChange={e => setNuevaAct(p => ({ ...p, dias_produccion: e.target.value }))} />
        </Field>
      </div>

      <div className={s.dos}>
        <Field label={t('stratix.new.status')}>
          <select value={nuevaAct.estado} onChange={e => setNuevaAct(p => ({ ...p, estado: e.target.value }))}>
            {COLUMNAS_KANBAN.map(c => <option key={c} value={c}>{estadoLabel(c, t)}</option>)}
          </select>
        </Field>
        <Field label={t('stratix.new.due')}>
          {/* Sin min/max el navegador acepta un año de 3 dígitos: así entraron las seis
              filas de 0206-03-23 que colgaban el Gantt (24/08/2026). */}
          <input type="date" min={limites.min} max={limites.max} value={nuevaAct.fecha_entrega}
            onChange={e => setNuevaAct(p => ({ ...p, fecha_entrega: e.target.value }))} />
        </Field>
      </div>

      <Field label={t('stratix.new.drive')}>
        <input type="url" value={nuevaAct.drive_url} placeholder={t('stratix.new.drivePh')}
          onChange={e => setNuevaAct(p => ({ ...p, drive_url: e.target.value }))} />
      </Field>

      <div className={s.acciones}>
        <button type="button" className={s.cancelar} onClick={() => cerrarFormAct()}>{t('common.cancel2')}</button>
        <button type="button" className={s.crear} disabled={creandoAct || sinTitulo} onClick={crearActividad}>
          {creandoAct
            ? (actEditando ? t('common.processing') : t('stratix.new.creating'))
            : actEditando ? t('common.saveChanges') : t('stratix.new.create')}
        </button>
      </div>
    </Modal>
  )
}
