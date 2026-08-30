'use client'
import { useState } from 'react'
import AppShell from '@/shared/components/shell/AppShell'
import ListToolbar from '@/shared/components/ui/ListToolbar'
import NewButton from '@/shared/components/ui/NewButton'
import { PageTransition } from '@/shared/motion'
import { useT } from '@/shared/i18n'
import { useReuniones } from '@/features/reuniones/hooks'
import { filtrarReuniones } from '@/features/reuniones/utils/filtrarReuniones'
import ReunionRow from '@/features/reuniones/components/listado/ReunionRow'
import s from './index.module.css'

// centinela-exime: bloques-similares@1 — lo reusable de esta pantalla YA se reusa: la barra es
// `ListToolbar` + `NewButton`, el patrón que rules/ui.md manda copiar de Admin, y el chip de
// estado es `ColorBadge`. Comparé con OrgManager (Admin) y DirectorioModule: los dos son la
// misma tríada barra + filas + vacío, pero con su dominio adentro. Lo propio de acá son dos
// líneas; un componente compartido para eso tendría más props que markup.

export default function ReunionesListado() {
  const { t } = useT()
  const { reuniones, cargando, error } = useReuniones()
  const [busqueda, setBusqueda] = useState('')
  const filtradas = filtrarReuniones(reuniones, busqueda)

  function abrirExpediente() {
    // La Tarea 7 del plan lo reemplaza por el expediente. Hoy no hay a dónde ir.
  }

  return (
    <AppShell>
      <PageTransition>
        {/* La acción primaria va en la barra de ESTA vista, no en el topbar (rules/ui.md). */}
        <ListToolbar busqueda={busqueda} setBusqueda={setBusqueda}
          action={<NewButton label={t('reuniones.nueva')} onClick={abrirExpediente} />} />

        {error && <p className={s.error}>{t('common.errorWithDetail', { detail: error })}</p>}
        {cargando && <p className={s.vacio}>{t('common.loading')}</p>}

        {!cargando && !error && filtradas.length === 0 && (
          <p className={s.vacio}>{busqueda.trim() ? t('reuniones.sinResultados') : t('reuniones.vacio')}</p>
        )}

        {filtradas.map(r => <ReunionRow key={r.id} reunion={r} onAbrir={abrirExpediente} />)}
      </PageTransition>
    </AppShell>
  )
}
