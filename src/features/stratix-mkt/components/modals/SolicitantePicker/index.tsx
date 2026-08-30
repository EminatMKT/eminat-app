'use client'
import { useApp } from '@/shared/context/AppContext'
import { Field } from '@/shared/components/ui'
import { useT } from '@/shared/i18n'
import { useStratix } from '@/features/stratix-mkt/components/StratixContext'

// centinela-exime: bloques-similares@2 — sale de `NewActivityModal`, que pasaba el techo de 150.
// Es el ÚNICO select del repo que lista inactivos, así que no hay con qué unificarlo: los demás
// filtran por `activo` y listo.

// Quién pidió la tarea. Lo que lo hace distinto de cualquier otro select de personas: si la
// tarea YA tenía un solicitante que después se dio de baja, ese usuario se sigue mostrando
// —marcado como inactivo y deshabilitado— en vez de desaparecer. Sin eso, abrir una tarea vieja
// y guardarla le borraba el solicitante sin que nadie lo tocara.
export default function SolicitantePicker() {
  const { usuarios } = useApp()
  const { t } = useT()
  const { nuevaAct, setNuevaAct } = useStratix()
  const nombre = (u: { nombre?: string | null; apellido?: string | null }) =>
    `${u.nombre || ''} ${u.apellido || ''}`.trim()

  return (
    <Field icon="📨" label={t('stratix.new.requestedBy')}>
      <select value={nuevaAct.solicitante_id}
        onChange={e => setNuevaAct(p => ({ ...p, solicitante_id: e.target.value }))}>
        <option value="">—</option>
        {usuarios.filter(u => !u.activo && u.id === nuevaAct.solicitante_id).map(u => (
          <option key={u.id} value={u.id as string} disabled>{nombre(u)} ({t('stratix.new.inactive')})</option>
        ))}
        {usuarios.filter(u => u.activo && u.id).map(u => (
          <option key={u.id} value={u.id as string}>{nombre(u)}</option>
        ))}
      </select>
    </Field>
  )
}
