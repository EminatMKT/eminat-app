'use client'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import { FilaLista, ColorBadge, Button } from '@/shared/components/ui'
import { COLOR_MARCA_FALLBACK } from '@/shared/context/empresa-derivations'
import type { Tema } from '@/features/reuniones/types'
import s from './index.module.css'

type Props = {
  tema: Tema
  onEditar: () => void
  onAlternar: () => void
}

/** Una fila del catálogo de asuntos. No tiene botón de borrar a propósito:
 *  `reunion_temas.tema_id` es ON DELETE RESTRICT porque borrar un asunto ya tratado reescribiría
 *  un acta pasada. La baja es `activo`. */
export default function TemaFila({ tema, onEditar, onAlternar }: Props) {
  const { colorMarca } = useApp()
  const { t } = useT()
  const color = colorMarca[tema.empresa] ?? COLOR_MARCA_FALLBACK
  return (
    <FilaLista color={color}>
      <div className={s.datos}>
        <span className={tema.activo ? s.titulo : `${s.titulo} ${s.tituloInactivo}`}>{tema.titulo}</span>
        {/* ColorBadge toma `children`, no un prop `label`. */}
        <ColorBadge color={color}>{tema.empresa}</ColorBadge>
        {!tema.activo && <span className={s.inactivo}>{t('admin.temas.inactivo')}</span>}
      </div>
      <div className={s.actions}>
        <Button kind="edit" onClick={onEditar} />
        {/* Sin `pressed`: el rótulo ya cambia con el estado — dice "Activar" o "Desactivar" — y
            `aria-pressed` describe el estado del botón, no el de la acción que nombra; con los
            dos juntos un lector de pantalla anuncia "Desactivar, presionado" cuando está activo. */}
        <Button kind="toggle" onClick={onAlternar}
          label={t(tema.activo ? 'admin.temas.desactivar' : 'admin.temas.activar')} />
      </div>
    </FilaLista>
  )
}

// centinela-exime: bloques-similares@3 — la caja SÍ se reusa (`FilaLista`); lo de adentro
// —título, marca de inactivo y las dos acciones— no lo cubre ninguna fila de `ui/`, y
// `VistaFila` es de vistas guardadas, no de este catálogo.
