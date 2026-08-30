'use client'
import { useState } from 'react'
import { ConfirmModal } from '@/shared/components/ui'
import { useApp } from '@/shared/context/AppContext'
import { deriveMiembrosPorId } from '@/shared/context/team-derivations'
import { useT } from '@/shared/i18n'
import ParticipanteRow from '@/features/reuniones/components/participantes/ParticipanteRow'
import { nombreDeParticipante } from '@/features/reuniones/utils/filasDeParticipante'
import type { Participante } from '@/features/reuniones/types'
import s from './index.module.css'
// centinela-exime: bloques-similares@2 — leí `ls src/shared/components/ui` (21). Las filas son
// `ParticipanteRow` y el diálogo es `ConfirmModal`; lo único propio es el `<ul>` y el vacío.
type Props = {
  participantes: Participante[]
  onCambiar: (id: string, patch: Partial<Participante>) => void
  onQuitar: (id: string) => Promise<void>
}

// Quitar pregunta antes: es un DELETE sin vuelta (rules/ui.md). Y el estado del diálogo vive acá
// y no en el panel porque es de la lista: quién se está por quitar.
export default function ParticipantesLista({ participantes, onCambiar, onQuitar }: Props) {
  const { usuarios } = useApp()
  const { t } = useT()
  const [aQuitar, setAQuitar] = useState<Participante | null>(null)
  const porId = deriveMiembrosPorId(usuarios)
  const nombreDe = (p: Participante) => nombreDeParticipante(p, porId, t('reuniones.participantes.sinNombre'))

  async function confirmarQuitar() {
    if (aQuitar) await onQuitar(aQuitar.id)
    setAQuitar(null)
  }
  if (!participantes.length) return <p className={s.vacio}>{t('reuniones.participantes.vacio')}</p>

  return (
    <>
      <ul className={s.lista}>
        {participantes.map(p => (
          <ParticipanteRow key={p.id} participante={p} nombre={nombreDe(p)}
            onCambiar={patch => onCambiar(p.id, patch)} onQuitar={() => setAQuitar(p)} />
        ))}
      </ul>
      {aQuitar && (
        <ConfirmModal destructive title={t('reuniones.participantes.quitarTitle')}
          message={t('reuniones.participantes.quitarMsg', { nombre: nombreDe(aQuitar) })}
          confirmLabel={t('reuniones.participantes.quitar')} onConfirm={confirmarQuitar}
          onClose={() => setAQuitar(null)} />
      )}
    </>
  )
}
