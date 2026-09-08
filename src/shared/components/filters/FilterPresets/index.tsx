'use client'
import { useT } from '@/shared/i18n'
import { Button, Dropdown } from '@/shared/components/ui'
import NombreVista from '../NombreVista'
import VistaFila from '../VistaFila'
import type { PresetsProps } from './types'
import s from './index.module.css'

// centinela-exime: bloques-similares@3 — lo sustancial ya se compone (`Dropdown`, `VistaFila`,
// `NombreVista`). Lo propio son el «sin vistas» y los dos separadores. Busqué en `ui/`: no hay
// menú con secciones ni estado-vacío compartido.

/** Las vistas guardadas, enteras adentro de un desplegable: qué hacer con la puesta si te
 *  apartaste de ella, la lista, y crear una nueva. */
export default function FilterPresets(props: PresetsProps) {
  const { vistas, activaId, modificada, onAplicar, onGuardar, onActualizar } = props
  const { onRenombrar, onBorrar, onMarcar } = props
  const { t } = useT()
  return (
    <Dropdown rotulo={t('common.filter.views')}>
      {activaId && modificada && (
        <div className={s.seccion}>
          <Button kind="confirm" label={t('common.filter.update')} onClick={() => void onActualizar(activaId)} />
          <NombreVista rotulo={t('common.filter.saveAsNew')} onConfirmar={onGuardar} />
        </div>
      )}
      {vistas.length === 0 && <p className={s.vacio}>{t('common.filter.viewsNone')}</p>}
      {vistas.map(v => (
        <VistaFila key={v.id} vista={v} puesta={v.id === activaId} onAplicar={onAplicar}
          onRenombrar={onRenombrar} onBorrar={onBorrar} onMarcar={onMarcar} />
      ))}
      <div className={s.seccion}>
        <NombreVista rotulo={t('common.filter.newView')} onConfirmar={onGuardar} />
      </div>
    </Dropdown>
  )
}

// Las vistas entraron enteras acá, y el disparador es lo único que ocupa lugar en la barra. Antes
// la fila cambiaba de forma según el estado —al modificarse una vista aparecían dos botones y un
// aviso—, y el filtro, que es el punto del panel, quedaba perdido entre controles de vistas.
//
// «Actualizar» y «Guardar como nueva» son de la VISTA PUESTA, no de la barra: van arriba de todo
// porque son la respuesta a lo que la cabecera ya dijo —que te apartaste de la vista—, y son lo
// primero que se busca al abrir el menú por ese motivo.
