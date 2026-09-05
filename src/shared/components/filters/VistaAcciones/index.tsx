'use client'
// centinela-exime: bloques-similares@2 — son tres `Button` y un `<span>`; el markup propio es el
// aviso de «modificada». Busqué en `ui/`: `ActivityAcciones` y `ExpedienteAcciones` son pies de
// modal y traen el dominio de su módulo adentro; esto vive en línea, dentro de una barra.
import { useT } from '@/shared/i18n'
import { Button } from '@/shared/components/ui'
import s from './index.module.css'

type Props = {
  vistaId: string
  /** Lo que hay en pantalla ya no es la vista: se dice, y se ofrece pisarla. */
  modificada: boolean
  onActualizar: (id: string) => Promise<void>
  onBorrar: (id: string) => Promise<void>
  onMarcar: (id: string) => Promise<void>
}

// Lo que se puede hacer con la vista que está elegida. Sale aparte de `FilterPresets` porque ése
// pasaba de las 50 líneas, y porque es lo único que sólo existe cuando hay una vista aplicada.
export default function VistaAcciones(props: Props) {
  const { vistaId, modificada, onActualizar, onBorrar, onMarcar } = props
  const { t } = useT()
  return (
    <>
      {modificada && (
        <>
          <span className={s.modificada}>{t('common.filter.modified')}</span>
          <Button kind="confirm" label={t('common.filter.update')} onClick={() => void onActualizar(vistaId)} />
        </>
      )}
      <Button kind="star" onClick={() => void onMarcar(vistaId)} />
      <Button kind="delete" label={t('common.filter.delete')} onClick={() => void onBorrar(vistaId)} />
    </>
  )
}
