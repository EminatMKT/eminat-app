'use client'
import { Button, CatalogoSelect, FilaLista } from '@/shared/components/ui'
import { useT } from '@/shared/i18n'
import { ASISTENCIA, ROL_EN_REUNION } from '@/features/reuniones/constants'
import type { Participante } from '@/features/reuniones/types'
import s from './index.module.css'

// centinela-exime: bloques-similares@2 — no dibuja ni la caja ni la barra: las dos salieron a
// `FilaLista`, compartido, porque `ReunionRow` las tenía iguales. Los dos selects salieron a
// `CatalogoSelect`, también compartido — eran el mismo markup dos veces en este archivo. Lo que
// queda es de la mesa: quién es, con qué rol y si vino.

type Props = {
  participante: Participante
  /** Quién es. Lo resuelve la lista: un interno sale del directorio, un externo de su fila. */
  nombre: string
  onCambiar: (patch: Partial<Participante>) => void
  onQuitar: () => void
}

// El ausente se atenúa: quién faltó es lo que se busca al releer un acta, y con todas las filas
// iguales hay que abrir el select de cada una para saberlo.
export default function ParticipanteRow({ participante, nombre, onCambiar, onQuitar }: Props) {
  const { t } = useT()
  const { invitado_empresa, rol_en_reunion, asistencia } = participante

  return (
    <FilaLista color={ROL_EN_REUNION.colores[rol_en_reunion]}
      className={asistencia === 'ausente' ? s.ausente : ''}>
      <span className={s.quien}>
        <span className={s.nombre}>{nombre}</span>
        {invitado_empresa && <span className={s.org}>{invitado_empresa}</span>}
      </span>

      <CatalogoSelect className={s.control} catalogo={ROL_EN_REUNION} valor={rol_en_reunion}
        etiqueta={t('common.role')} onChange={v => onCambiar({ rol_en_reunion: v })} />

      <CatalogoSelect className={s.control} catalogo={ASISTENCIA} valor={asistencia}
        etiqueta={t('reuniones.campo.asistencia')} onChange={v => onCambiar({ asistencia: v })} />

      <Button kind="delete" label={t('reuniones.participantes.quitar')} onClick={onQuitar} />
    </FilaLista>
  )
}
