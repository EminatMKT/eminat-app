'use client'
import { useEffect } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { Field, Select } from '@/shared/components/ui'
import { useT } from '@/shared/i18n'
import { useTasks } from '@/features/tasks/components/TasksContext'
import ResponsiblesPicker from './ResponsiblesPicker'
import s from './index.module.css'

const NO_BRAND = ''

export default function ActivityAssignment() {
  const { marcas, miembrosAsignables } = useApp()
  const { t } = useT()
  const { nuevaAct, setNuevaAct } = useTasks()
  const brandOffered = !nuevaAct.empresa || marcas.some(m => m.codigo === nuevaAct.empresa)

  useEffect(() => {
    if (!brandOffered) setNuevaAct(p => ({ ...p, empresa: NO_BRAND }))
  }, [brandOffered, setNuevaAct])

  return (
    <div className={s.dos}>
      <div>
        <Field required icon="🎨" label={t('stratix.new.brand')}>
          <Select value={nuevaAct.empresa} placeholder={t('stratix.new.select')}
            onChange={e => setNuevaAct(p => ({ ...p, empresa: e.target.value }))}>
            {marcas.length === 0 && <option disabled>{t('stratix.new.noBrands')}</option>}
            {marcas.map(m => <option key={m.codigo} value={m.codigo}>{m.codigo} — {m.nombre}</option>)}
          </Select>
        </Field>
      </div>
      <div className={s.responsibles}>
        <Field icon="👤" label={t('tasks.responsibles.label')}>
          <ResponsiblesPicker members={miembrosAsignables} rows={nuevaAct.responsables}
            onChange={responsables => setNuevaAct(p => ({ ...p, responsables }))} />
        </Field>
      </div>
    </div>
  )
}

// WHO executes the task and for WHICH brand. The brand starts on the blank placeholder: without it
// the browser paints the first option while the state is still '', and saves a brand nobody chose.
//
// If the saved brand stopped being offered —the admin deactivated it— the <select> falls back to
// the placeholder while the state keeps the old code, and the one not shown would be saved. So the
// state is CLEARED; picking the first brand of the list instead is exactly the old "New task" bug:
// a value nobody chose that gets saved anyway.
//
// The responsables picker is a compact combobox beside the brand, in the same two-column row: the
// label names its box through `htmlFor`, and a click on the label opens it.
