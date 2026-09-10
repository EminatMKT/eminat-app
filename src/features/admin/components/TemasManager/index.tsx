'use client'
import { useState } from 'react'
import { useT } from '@/shared/i18n'
import { Button, ListToolbar } from '@/shared/components/ui'
import useTemas from '@/features/admin/hooks/useTemas'
import filtrarTemas from '@/features/admin/utils/filtrarTemas'
import TemaFila from '../TemaFila'
import TemaModal from '../TemaModal'
import type { Tema } from '@/features/reuniones/types'
import s from './index.module.css'

/** El catálogo de asuntos. NO usa `OrgManager`: `temas` no tiene `codigo` y su unicidad es por
 *  empresa, no global — el porqué largo está en la decisión D1 del plan de la fase 2. */
export default function TemasManager() {
  const { t } = useT()
  const { temas, cargando, mensaje, error, save, alternarActivo, limpiarError } = useTemas()
  const [busqueda, setBusqueda] = useState('')
  const [editando, setEditando] = useState<{ tema?: Tema } | null>(null)

  const visibles = filtrarTemas(temas, busqueda)
  const vacio = temas.length === 0 ? 'admin.temas.vacio' : 'admin.temas.sinResultados'

  // El error de un intento anterior no sobrevive a abrir un modal nuevo.
  function openModal(tema?: Tema) {
    limpiarError()
    setEditando({ tema })
  }

  return (
    <div>
      <p className={s.sub}>{t('admin.temas.sub')}</p>
      {/* ⚠️ `placeholderKey`: sin él la barra dice "Buscar…" y `admin.temas.buscar` queda muerta. */}
      <ListToolbar busqueda={busqueda} setBusqueda={setBusqueda} placeholderKey="admin.temas.buscar"
        action={<Button kind="new" label={t('admin.temas.nuevo')} onClick={() => openModal()} />} />
      {mensaje && !editando && <p className={s.error}>{mensaje}</p>}
      {!cargando && visibles.length === 0 && <p className={s.vacio}>{t(vacio)}</p>}
      <ul className={s.lista}>
        {visibles.map(tema => (
          <TemaFila key={tema.id} tema={tema}
            onEditar={() => openModal(tema)} onAlternar={() => void alternarActivo(tema)} />
        ))}
      </ul>
      {editando && (
        <TemaModal tema={editando.tema} error={error} onSave={save} onCerrar={() => setEditando(null)} />
      )}
    </div>
  )
}

// centinela-exime: bloques-similares@3 — busqué `OrgManager` (no sirve: `temas` no tiene
// `codigo` ni unicidad global, D1 del plan), `RolesManager` y `UserTable`: cada uno arma su
// propio buscador + lista, no hay una pantalla-de-lista compartida en `ui/`.

// centinela-exime: useState@1 — mismo caso que `ReunionesListado`: la búsqueda filtra la lista
// y `editando` decide qué abre el modal; ninguna operación toca las dos.
