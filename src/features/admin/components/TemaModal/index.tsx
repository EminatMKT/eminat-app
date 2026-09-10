'use client'
import { useState } from 'react'
import { Modal, Field, Button, ErrorList } from '@/shared/components/ui'
import { useApp } from '@/shared/context/AppContext'
import { useT, type I18nKey } from '@/shared/i18n'
import type { Tema, DatosTema } from '@/features/reuniones/types'
type Props = {
  tema?: Tema
  error: I18nKey | null
  onSave: (id: string | null, fila: DatosTema) => Promise<boolean>
  onCerrar: () => void
}

/** Alta y corrección de un tema del catálogo de asuntos. */
export default function TemaModal({ tema, error, onSave, onCerrar }: Props) {
  const { empresas, usuario: quienOpera } = useApp()
  const { t } = useT()
  // Las mismas que ofrece el acta (`DatosGenerales`): TODAS las activas, no `marcas`.
  const ofrecibles = empresas.filter(e => e.activo)
  const [campos, setCampos] = useState({ titulo: tema?.titulo ?? '', empresa: tema?.empresa ?? '', ocupado: false })
  const { titulo, empresa, ocupado } = campos
  const listo = titulo.trim() !== '' && empresa !== '' && Boolean(quienOpera?.id)

  async function confirmar() {
    if (!listo || !quienOpera?.id) return
    setCampos(c => ({ ...c, ocupado: true }))
    const ok = await onSave(tema?.id ?? null, { empresa, titulo: titulo.trim(), creado_por_id: quienOpera.id })
    setCampos(c => ({ ...c, ocupado: false }))
    if (ok) onCerrar()
  }
  const botonConfirmar = <Button kind="confirm" deshabilitado={!listo} ocupado={ocupado} onClick={confirmar}
    label={t(tema ? 'common.saveChanges' : 'admin.temas.crear')} />

  // La empresa se fija sólo al crear (UNIQUE por empresa+título): el select se deshabilita al editar.
  return (
    <Modal title={t(tema ? 'common.edit' : 'admin.temas.nuevo')} anchoRem={30}
      onClose={onCerrar} footer={botonConfirmar}>
      <ErrorList errores={error ? [error] : []} />
      <Field label={t('admin.temas.campoTitulo')} required>
        <input value={titulo} onChange={e => setCampos(c => ({ ...c, titulo: e.target.value }))} />
      </Field>
      <Field label={t('admin.temas.campoEmpresa')} required>
        <select value={empresa} disabled={Boolean(tema)}
          onChange={e => setCampos(c => ({ ...c, empresa: e.target.value }))}>
          <option value="">{t('common.select')}</option>
          {ofrecibles.map(m => <option key={m.codigo} value={m.codigo}>{m.nombre}</option>)}
        </select>
      </Field>
    </Modal>
  )
}

// El alta y la corrección de un asunto del catálogo desde `/admin`, para `TemasManager`.
// La empresa sólo se elige al crear (fase 2 de `operations`, Tarea 7).
// centinela-exime: bloques-similares@3 — `Modal`, `Field` y `Button` se reusan; lo propio son
// los dos campos. `OrgModal` es data-driven y éste no (D1 del plan).
