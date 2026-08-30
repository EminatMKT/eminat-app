'use client'
import { useState } from 'react'
import { AppShell } from '@/shared/components/shell'
import { Button, ListToolbar } from '@/shared/components/ui'
import { PageTransition } from '@/shared/motion'
import { useT } from '@/shared/i18n'
import ExpedienteView from '@/features/reuniones/components/expediente/ExpedienteView'
import EstadoListado from '@/features/reuniones/components/listado/EstadoListado'
import ReunionRow from '@/features/reuniones/components/listado/ReunionRow'
import { filtrarReuniones } from '@/features/reuniones/utils/filtrarReuniones'
import { useReuniones } from '@/features/reuniones/hooks'
import s from './index.module.css'

// centinela-exime: bloques-similares@2 — leí `ls src/shared/components/ui`: lo reusable YA se
// reusa (`ListToolbar` + `Button`, el patrón de Admin) y ninguno necesitó un prop nuevo.
// centinela-exime: useState@1 — `busqueda` y `expedienteAbierto` no viajan juntos: filtrar no
// abre nada y abrir no filtra.
export default function ReunionesListado() {
  const { t } = useT()
  const { reuniones, cargando, error, recargar } = useReuniones()
  const [busqueda, setBusqueda] = useState('')
  const [expedienteAbierto, setExpedienteAbierto] = useState(false)
  const filtradas = filtrarReuniones(reuniones, busqueda)

  function cerrarYRecargar() {
    setExpedienteAbierto(false)
    void recargar()
  }

  return (
    <AppShell>
      <PageTransition>
        {/* La acción primaria va en la barra de ESTA vista, no en el topbar (rules/ui.md). */}
        <ListToolbar busqueda={busqueda} setBusqueda={setBusqueda}
          action={<Button kind="new" label={t('reuniones.nueva')} onClick={() => setExpedienteAbierto(true)} />} />

        <EstadoListado cargando={cargando} error={error}
          visibles={filtradas.length} buscando={Boolean(busqueda.trim())} />

        <ul className={s.lista}>
          {filtradas.map(r => <ReunionRow key={r.id} reunion={r} />)}
        </ul>

        {expedienteAbierto && (
          <ExpedienteView onCerrar={() => setExpedienteAbierto(false)} onGuardada={cerrarYRecargar} />
        )}
      </PageTransition>
    </AppShell>
  )
}
