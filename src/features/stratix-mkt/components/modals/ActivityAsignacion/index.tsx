'use client'
import { useEffect } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { Field } from '@/shared/components/ui'
import { useT } from '@/shared/i18n'
import { useStratix } from '@/features/stratix-mkt/components/StratixContext'
import s from './index.module.css'

// centinela-exime: bloques-similares@2 — dos `Field` con su `select`, sacados de
// `NewActivityModal` al partirlo. Van juntos y aparte porque cargan una invariante propia.

// A QUIÉN y a QUÉ marca. Los dos son obligatorios y los dos arrancan en el placeholder vacío:
// sin él el navegador pinta la primera opción mientras el estado sigue en '' (rules/ui.md).
export default function ActivityAsignacion() {
  const { marcas, miembrosAsignables } = useApp()
  const { t } = useT()
  const { nuevaAct, setNuevaAct } = useStratix()

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
      <Field required icon="👤" label={t('stratix.new.assignee')}>
        <select value={nuevaAct.responsable_id} onChange={e => setNuevaAct(p => ({ ...p, responsable_id: e.target.value }))}>
          <option value="">{t('stratix.new.select')}</option>
          {miembrosAsignables.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
        </select>
      </Field>
    </div>
  )
}
