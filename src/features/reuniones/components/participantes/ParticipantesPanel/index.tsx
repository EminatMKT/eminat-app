'use client'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import InternoPicker from '@/features/reuniones/components/participantes/InternoPicker'
import InvitadoExternoForm from '@/features/reuniones/components/participantes/InvitadoExternoForm'
import ParticipantesLista from '@/features/reuniones/components/participantes/ParticipantesLista'
import { useParticipantes } from '@/features/reuniones/hooks'
import { filaExterna, filaInterna } from '@/features/reuniones/utils/filasDeParticipante'
import { internosDisponibles } from '@/features/reuniones/utils/internosDisponibles'
import type { Externo } from '@/features/reuniones/types'
import s from './index.module.css'
// centinela-exime: bloques-similares@2 — leí `ls src/shared/components/ui` (21) más dashboard/ y
// shell/. No hay markup propio salvo el rótulo de la sección: la lista, el alta del equipo y la
// del invitado son sus componentes. Nada que unificar.
type Props = {
  reunionId: string
}

// Sólo aparece sobre una reunión que ya existe: un participante necesita su `reunion_id`, así que
// en el alta no hay dónde colgarlo. Se guarda primero y se arma la mesa después.
export default function ParticipantesPanel({ reunionId }: Props) {
  const { usuarios } = useApp()
  const { t } = useT()
  const { participantes, fallo, agregar, cambiar, quitar } = useParticipantes(reunionId)

  return (
    <section className={s.panel}>
      <h3 className={s.titulo}>{t('reuniones.participantes.title')}</h3>
      <ParticipantesLista participantes={participantes} onCambiar={cambiar} onQuitar={quitar} />

      <InternoPicker disponibles={internosDisponibles(usuarios, participantes)}
        onAgregar={(id: string) => agregar(filaInterna(reunionId, id))} />
      <InvitadoExternoForm onAgregar={(e: Externo) => agregar(filaExterna(reunionId, e))} />

      {/* El rechazo de la base se muestra acá y no dentro de cada alta: es el mismo mensaje para
          las dos, y `role="alert"` hace que un lector de pantalla lo anuncie al aparecer. */}
      {fallo && <p className={s.fallo} role="alert">{t(fallo.key, fallo.vars)}</p>}
    </section>
  )
}
