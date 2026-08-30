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
// centinela-exime: useState@1 — `busqueda` y `abierta` no viajan juntos: filtrar no abre nada
// y abrir no filtra.
// `abierta` es el id de la reunión abierta, o NUEVA para el alta: es el mismo modal —con id
// edita, sin él crea—. Con un booleano aparte, "abierto y sin id, pero editando" sería posible.
const NUEVA = 'nueva'

export default function ReunionesListado() {
  const { t } = useT()
  const { reuniones, cargando, error, recargar } = useReuniones()
  const [busqueda, setBusqueda] = useState('')
  const [abierta, setAbierta] = useState<string | null>(null)
  const filtradas = filtrarReuniones(reuniones, busqueda)
  function cerrarYRecargar() {
    setAbierta(null)
    void recargar()
  }

  return (
    <AppShell>
      <PageTransition>
        {/* La acción primaria va en la barra de ESTA vista, no en el topbar (rules/ui.md). */}
        <ListToolbar busqueda={busqueda} setBusqueda={setBusqueda}
          action={<Button kind="new" label={t('reuniones.nueva')} onClick={() => setAbierta(NUEVA)} />} />
        <EstadoListado cargando={cargando} error={error}
          visibles={filtradas.length} buscando={Boolean(busqueda.trim())} />
        <ul className={s.lista}>
          {filtradas.map(r => <ReunionRow key={r.id} reunion={r} onAbrir={() => setAbierta(r.id)} />)}
        </ul>
        {abierta && (
          <ExpedienteView reunionId={abierta === NUEVA ? undefined : abierta}
            onCerrar={() => setAbierta(null)} onGuardada={cerrarYRecargar} />
        )}
      </PageTransition>
    </AppShell>
  )
}
