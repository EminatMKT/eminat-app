'use client'
import { useT } from '@/shared/i18n'
import { Button, Dropdown } from '@/shared/components/ui'
import NombreVista from '../NombreVista'
import VistaFila from '../VistaFila'
import type { PresetsProps } from './types'
import s from './index.module.css'

// centinela-exime: bloques-similares@3 — lo sustancial ya se compone (`Dropdown`, `VistaFila`,
// `NombreVista`, `Button`). Lo propio es el «sin vistas». Busqué en `ui/`: no hay estado-vacío
// compartido.

/** Las vistas guardadas: la lista adentro de un desplegable, y guardar y actualizar a la vista,
 *  en la barra. */
export default function FilterPresets(props: PresetsProps) {
  const { vistas, activaId, modificada, onAplicar, onGuardar, onActualizar } = props
  const { onRenombrar, onBorrar, onMarcar } = props
  const { t } = useT()
  const puestaModificada = !!activaId && modificada
  return (
    <>
      <Dropdown rotulo={t('common.filter.views')}>
        {vistas.length === 0 && <p className={s.vacio}>{t('common.filter.viewsNone')}</p>}
        {vistas.map(v => (
          <VistaFila key={v.id} vista={v} puesta={v.id === activaId} onAplicar={onAplicar}
            onRenombrar={onRenombrar} onBorrar={onBorrar} onMarcar={onMarcar} />
        ))}
      </Dropdown>
      <Button kind="confirm" label={t('common.filter.update')} deshabilitado={!puestaModificada}
        onClick={() => void onActualizar(activaId)} />
      <NombreVista kind="new" onConfirmar={onGuardar}
        rotulo={t(puestaModificada ? 'common.filter.saveAsNew' : 'common.filter.newView')} />
    </>
  )
}

// Guardar una vista y actualizarla viven en la BARRA, no adentro del desplegable. Estaban adentro
// —«+ Nueva vista» al pie de la lista, y «Actualizar» en una sección que aparecía arriba—, y ahí
// la función existía sin que nada en pantalla la ofreciera: para descubrir que las combinaciones
// se pueden guardar con nombre había que abrir un menú que dice «Vistas», o sea que había que
// saberlo de antes. Una funcionalidad que sólo encuentra quien ya la conoce no está.
//
// El desplegable queda con lo que SÍ es una lista: las vistas, cada una con su ✏️ ★ 🗑. Renombrar,
// marcar por defecto y borrar operan sobre UNA fila, así que su lugar es la fila.
//
// Los dos están SIEMPRE, y «Actualizar» atraviesa un ciclo: apagado mientras no haya una vista
// puesta que hayas modificado, encendido en cuanto la modificás. Aparecer y desaparecer según el
// estado es la otra forma de esconder un control — nadie aprende que existe algo que sólo se ve
// cuando ya hiciste lo que había que hacer para verlo. Presente y apagado, en cambio, enseña las
// dos cosas de una: que se puede actualizar una vista, y qué hay que hacer para poder.
//
// «Guardar» sí cambia el rótulo, no la presencia: con una vista puesta y modificada dice «Guardar
// como nueva», porque al lado está «Actualizar» y la pregunta pasa a ser cuál de las dos.
