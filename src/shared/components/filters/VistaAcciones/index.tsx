'use client'
// centinela-exime: bloques-similares@2 — el markup propio es el aviso de «modificada»; el resto
// son `Button`. `ActivityAcciones` y `ExpedienteAcciones` son pies de modal con el dominio de su
// módulo adentro; esto vive en línea, dentro de una barra.
import type { ReactNode } from 'react'
import { useT } from '@/shared/i18n'
import { Button } from '@/shared/components/ui'
import BorrarVista from '../BorrarVista'
import NombreVista from '../NombreVista'
import s from './index.module.css'

// centinela-exime: familia-dispersa@2 — los otros `*Acciones` son la barra de acciones de SU
// entidad (una actividad, un expediente): comparten el nombre y nada más.
type Props = {
  vistaId: string
  /** El «guardar como nueva»: va PEGADO a «Actualizar» porque son las dos salidas de la misma
   *  decisión, y separadas por ★ y Borrar no se leían como alternativas. */
  children?: ReactNode
  /** Se usa en la pregunta de borrado y como valor inicial al renombrar. */
  nombre: string
  /** Lo de pantalla ya no es la vista: se dice, y se ofrece pisarla. */
  modificada: boolean
  onActualizar: (id: string) => Promise<void>
  onRenombrar: (id: string, n: string) => Promise<void>
  onBorrar: (id: string) => Promise<void>
  onMarcar: (id: string) => Promise<void>
}

// Lo que se puede hacer con la vista elegida. Es lo único que sólo existe cuando hay una puesta.
export default function VistaAcciones(props: Props) {
  const { vistaId, nombre, modificada, children, onActualizar, onRenombrar, onBorrar, onMarcar } = props
  const { t } = useT()
  return (
    <>
      {modificada && (
        <>
          <span className={s.modificada}>{t('common.filter.modified')}</span>
          <Button kind="confirm" label={t('common.filter.update')} onClick={() => void onActualizar(vistaId)} />
        </>
      )}
      {children}
      {/* `key` con el nombre: al cambiar de vista el campo se remonta con el nombre nuevo. */}
      <NombreVista key={nombre} rotulo={t('common.filter.rename')} inicial={nombre}
        onConfirmar={n => onRenombrar(vistaId, n)} />
      <Button kind="star" onClick={() => void onMarcar(vistaId)} />
      <BorrarVista vistaId={vistaId} nombre={nombre} onBorrar={onBorrar} />
    </>
  )
}
