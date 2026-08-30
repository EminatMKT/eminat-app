'use client'
import { MESES } from '@/shared/context/AppContext'
import { Field } from '@/shared/components/ui'
import { useT } from '@/shared/i18n'
import { useStratix } from '@/features/stratix-mkt/components/StratixContext'
import s from './index.module.css'

// centinela-exime: bloques-similares@2 — sale de `NewActivityModal`, que pasaba el techo de 150.
// centinela-exime: select-con-default@2 — el mes ARRANCA en el que corre, y eso significa algo:
// sería el mismo aunque la lista estuviera en otro orden. No es la primera opción de un
// dropdown, que es lo que la regla persigue.
// Cuánto esfuerzo lleva la tarea y en qué mes cae. Van juntos porque son los tres que alimentan
// el reporte de pago: el mes agrupa, las horas suman y los días dibujan la barra del Gantt.
export default function ActivityNumeros() {
  const { t } = useT()
  const { nuevaAct, setNuevaAct } = useStratix()

  return (
    <div className={s.tres}>
      <Field icon="📅" label={t('stratix.new.month')}>
        <select value={nuevaAct.mes} onChange={e => setNuevaAct(p => ({ ...p, mes: e.target.value }))}>
          {MESES.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </Field>
      <Field icon="⏱" label={t('stratix.new.hours')}>
        <input type="number" min="0" placeholder="0" value={nuevaAct.horas}
          onChange={e => setNuevaAct(p => ({ ...p, horas: e.target.value }))} />
      </Field>
      <Field icon="📆" label={t('stratix.new.days')}>
        <input type="number" min="0" placeholder="0" value={nuevaAct.dias_produccion}
          onChange={e => setNuevaAct(p => ({ ...p, dias_produccion: e.target.value }))} />
      </Field>
    </div>
  )
}
