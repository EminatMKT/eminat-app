'use client'
import { useT } from '@/shared/i18n'
import { Button } from '@/shared/components/ui'
import type { VistaFiltro } from '@/shared/data'
import BorrarVista from '../BorrarVista'
import NombreVista from '../NombreVista'
import s from './index.module.css'

// centinela-exime: bloques-similares@3 — busqué en `ui/`: `FilaLista` no lleva acciones propias,
// `ListToolbar` es un encabezado con buscador, y `RowMenu` es un «…» con `fixed` calculado a mano
// — acá sería un menú adentro de un menú.

// centinela-exime: boton-a-mano@3 — el nombre no es una acción de la paleta, es la SUPERFICIE de
// la fila: se lleva el ancho libre para que aplicar la vista tenga blanco grande y ande con el
// teclado. Es el único a mano — la ★ y el 🗑 sí son `Button`.

type Props = {
  vista: VistaFiltro
  puesta: boolean
  onAplicar: (id: string) => void
  onRenombrar: (id: string, nombre: string) => Promise<void>
  onBorrar: (id: string) => Promise<void>
  onMarcar: (id: string) => Promise<void>
}

/** Una vista guardada dentro del desplegable: el nombre la aplica, y a la derecha lo que se le
 *  puede hacer — renombrar, abrir con ésta, borrar. */
export default function VistaFila(props: Props) {
  const { vista, puesta, onAplicar, onRenombrar, onBorrar, onMarcar } = props
  const { t } = useT()
  const { id, nombre, abre_por_defecto: abre } = vista
  return (
    <div className={s.fila}>
      <button type="button" className={`${s.nombre}${puesta ? ` ${s.puesta}` : ''}`}
        onClick={() => onAplicar(id)} title={t('common.filter.applyView', { nombre })}
        aria-current={puesta || undefined}>
        {nombre}
      </button>
      {/* Sin `key`: el diálogo se monta recién al abrirlo, así que el campo ya arranca con el
          nombre vigente sin remontar nada desde afuera. */}
      <NombreVista kind="edit" iconOnly rotulo={t('common.filter.rename')} inicial={nombre}
        onConfirmar={n => onRenombrar(id, n)} />
      <Button kind="star" iconOnly pressed={abre} onClick={() => void onMarcar(id)}
        label={t(abre ? 'common.filter.unsetDefault' : 'common.setDefault')} />
      <BorrarVista vistaId={id} nombre={nombre} onBorrar={onBorrar} iconOnly />
    </div>
  )
}

// Existe porque las tres acciones de una vista bajaron a su fila: antes vivían en la barra y sólo
// para la vista puesta, así que renombrar otra pedía elegirla primero. Acá cada una se opera donde
// se la ve, y la barra queda con los filtros y nada más.
//
// La ★ va con `pressed` y no como acción suelta: es un interruptor —«abrir con ésta»— y apagarlo
// es tan legítimo como prenderlo. Sin los dos estados, quien la aprieta no sabe qué quedó.
