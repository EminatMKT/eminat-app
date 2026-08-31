'use client'
import { Field } from '@/shared/components/ui'
import { useT } from '@/shared/i18n'
import { useStratix } from '@/features/stratix-mkt/components/StratixContext'
import s from './index.module.css'

// centinela-exime: bloques-similares@1 — sale de `NewActivityModal`, que pasaba el techo de 150.
// Cuánto esfuerzo lleva la tarea: las horas suman en el reporte de pago y los días dibujan la
// barra del Gantt.
//
// El selector de mes se fue el 31/08. Era un dato que ya sabía el calendario: en 78 de 78 tareas
// creadas por la app, el mes imputado era el mes en que se creó la tarea — nadie eligió nunca
// otro. Ahora lo pone el DEFAULT de `actividades.fecha_inicio`, y se corrige en el campo
// "Fecha de inicio" de `ActivityPlanificacion`, para el día que alguien cargue una tarea tarde.
export default function ActivityNumeros() {
  const { t } = useT()
  const { nuevaAct, setNuevaAct } = useStratix()

  return (
    <div className={s.dos}>
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
