'use client'
import { useEffect } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { Field } from '@/shared/components/ui'
import { useT } from '@/shared/i18n'
import { useTasks } from '@/features/tasks/components/TasksContext'
import ResponsablesChecklist from './ResponsablesChecklist'
import s from './index.module.css'

// centinela-exime: bloques-similares@3 — dos `Field` con su `select`, sacados de
// `NewActivityModal` al partirlo. Van juntos y aparte porque cargan una invariante propia.

// WHO and which brand. The brand is required and starts on the empty placeholder (rules/ui.md);
// responsibles are optional: zero, one or many, with at most one leader.
export default function ActivityAsignacion() {
  const { marcas, miembrosAsignables } = useApp()
  const { t } = useT()
  const { nuevaAct, setNuevaAct } = useTasks()

  // Si la marca guardada dejó de ofrecerse —el admin la desactivó— el <select> cae al
  // placeholder mientras el estado conserva el código viejo, y se guardaría el que no se ve.
  // Se LIMPIA el estado; no se elige la primera de la lista, que es lo que hacía antes y es
  // exactamente el bug de "New task": un valor que nadie eligió y queda guardado igual.
  useEffect(() => {
    if (nuevaAct.empresa && !marcas.some(m => m.codigo === nuevaAct.empresa)) {
      setNuevaAct(p => ({ ...p, empresa: '' }))
    }
  }, [marcas, nuevaAct.empresa, setNuevaAct])

  return (
    <div className={s.dos}>
      <Field required icon="🎨" label={t('stratix.new.brand')}>
        <select value={nuevaAct.empresa} onChange={e => setNuevaAct(p => ({ ...p, empresa: e.target.value }))}>
          <option value="">{t('stratix.new.select')}</option>
          {marcas.map(m => <option key={m.codigo} value={m.codigo}>{m.codigo} — {m.nombre}</option>)}
        </select>
      </Field>
      <Field icon="👤" label={t('tasks.responsibles.label')}>
        <ResponsablesChecklist members={miembrosAsignables} rows={nuevaAct.responsables}
          onChange={responsables => setNuevaAct(p => ({ ...p, responsables }))} />
      </Field>
    </div>
  )
}
