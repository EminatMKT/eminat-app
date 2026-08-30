'use client'
import { useState } from 'react'
import { AppShell } from '@/shared/components/shell'
import { Button, ListToolbar } from '@/shared/components/ui'
import { PageTransition } from '@/shared/motion'
import { useT } from '@/shared/i18n'
import ExpedienteView from '@/features/reuniones/components/expediente/ExpedienteView'
import ReunionRow from '@/features/reuniones/components/listado/ReunionRow'
import { filtrarReuniones } from '@/features/reuniones/utils/filtrarReuniones'
import { useReuniones } from '@/features/reuniones/hooks'
import s from './index.module.css'

// centinela-exime: bloques-similares@2 — leí `ls src/shared/components/ui` entero (20). Lo
// reusable de esta pantalla YA se reusa, que es la salida 1: la barra es `ListToolbar` +
// `NewButton` —el patrón que rules/ui.md manda copiar de Admin— y el chip es `ColorBadge`.
// Ninguno necesitó un prop nuevo. Comparé además con OrgManager y DirectorioModule: son la
// misma tríada barra + filas + vacío, pero con su dominio adentro. Lo propio de acá son dos
// líneas, y un componente compartido para eso tendría más props que markup.

export default function ReunionesListado() {
  const { t } = useT()
  const { reuniones, cargando, error, recargar } = useReuniones()
  // `busqueda` y `expediente` son dos cosas independientes —filtrar no abre nada y abrir no
  // filtra—, así que van sueltos en vez de en un objeto (rules/componentes.md).
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

        {error && <p className={s.error}>{t('common.errorWithDetail', { detail: error })}</p>}
        {cargando && <p className={s.vacio}>{t('common.loading')}</p>}

        {!cargando && !error && filtradas.length === 0 && (
          <p className={s.vacio}>{busqueda.trim() ? t('reuniones.sinResultados') : t('reuniones.vacio')}</p>
        )}

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
