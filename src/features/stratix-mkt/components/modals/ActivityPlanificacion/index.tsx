'use client'
import { COLUMNAS_KANBAN } from '@/shared/context/AppContext'
import { Field } from '@/shared/components/ui'
import { estadoLabel } from '@/shared/constants/domain'
import { useT } from '@/shared/i18n'
import { limitesFecha } from '@/features/stratix-mkt/utils/gantt-rango'
import ActivityNumeros from '@/features/stratix-mkt/components/modals/ActivityNumeros'
import { useStratix } from '@/features/stratix-mkt/components/StratixContext'
import s from './index.module.css'

// centinela-exime: bloques-similares@2 — sale de `NewActivityModal`, que pasaba el techo de 150.
// centinela-exime: select-con-default@2 — toda tarea del Kanban empieza en "Pendiente", y sería
// el mismo default aunque las columnas estuvieran en otro orden. Pedir que lo elijan es fricción
// sin nada a cambio.
// CUÁNDO y CUÁNTO. La otra mitad —qué tarea es— vive en `ActivityCampos`.
export default function ActivityPlanificacion() {
  const { t } = useT()
  const { nuevaAct, setNuevaAct } = useStratix()
  const limites = limitesFecha(new Date())

  return (
    <>
      <ActivityNumeros />

      <div className={s.dos}>
        <Field icon="⚡" label={t('stratix.new.status')}>
          <select value={nuevaAct.estado} onChange={e => setNuevaAct(p => ({ ...p, estado: e.target.value }))}>
            {COLUMNAS_KANBAN.map(c => <option key={c} value={c}>{estadoLabel(c, t)}</option>)}
          </select>
        </Field>
        {/* Sin min/max el navegador acepta un año de 3 dígitos: así entraron las seis filas de
            0206-03-23 que colgaban el Gantt (24/08/2026). */}
        <Field icon="🗓" label={t('stratix.new.due')}>
          <input type="date" min={limites.min} max={limites.max} value={nuevaAct.fecha_entrega}
            onChange={e => setNuevaAct(p => ({ ...p, fecha_entrega: e.target.value }))} />
        </Field>
      </div>

      <Field icon="🔗" label={t('stratix.new.drive')}>
        <input type="url" value={nuevaAct.drive_url} placeholder={t('stratix.new.drivePh')}
          onChange={e => setNuevaAct(p => ({ ...p, drive_url: e.target.value }))} />
      </Field>
    </>
  )
}
