'use client'
// centinela-exime: bloques-similares@3 — ES la unificación: crear una vista y renombrarla pasan
// por el MISMO diálogo. Lo único dibujado a mano es el `<input>` que `Field` envuelve, y no hay
// componente de input en `ui/`: `Field` estiliza el control de su hijo, no lo provee.

// centinela-exime: identificador-en-espanol@2 — `rotulo` e `inicial` son el vocabulario de esta
// familia, que está en español entera (`VistaFila`, `BorrarVista`). Traducir sólo este archivo
// deja dos idiomas entre hermanos; el motor de filtros se renombra completo o no se renombra.
import { useState, type KeyboardEvent } from 'react'
import { useT } from '@/shared/i18n'
import { Button, Field, Modal } from '@/shared/components/ui'
import { ENTER, MODAL_REM, FIELD_KEY, SAVE_KEY } from './constants'

type Props = {
  /** Qué botón lo abre: `new` para crear una vista, `edit` para corregir el nombre de una. */
  kind: 'new' | 'edit'
  /** Lo que se lee en el botón y encabeza el diálogo: «Nueva vista», «Guardar como nueva». */
  rotulo: string
  /** En una fila de menú el rótulo entero la rompe: queda el ícono, y `rotulo` es su nombre
   *  accesible. */
  iconOnly?: boolean
  /** Con qué texto abre el campo. Vacío al crear; el nombre actual al renombrar — renombrar es
   *  CORREGIR un nombre, y arrancar en blanco obliga a reescribirlo entero por una letra. */
  inicial?: string
  onConfirmar: (nombre: string) => Promise<void>
}

export default function NombreVista({ kind, rotulo, iconOnly, inicial = '', onConfirmar }: Props) {
  const { t } = useT()
  // Abrir y el texto van juntos: abrir ES «empezá de nuevo desde `inicial`», o sea las dos cosas
  // en un `setForm`, y no dos setters que hay que acordarse de llamar en el mismo orden.
  const [form, setForm] = useState({ abierto: false, nombre: inicial })
  const { abierto, nombre } = form
  const limpio = nombre.trim()

  const abrir = () => setForm({ abierto: true, nombre: inicial })
  const cerrar = () => setForm(p => ({ ...p, abierto: false }))
  const confirmar = async () => {
    if (!limpio) return
    await onConfirmar(limpio)
    // Al crear se vacía para la próxima; al renombrar el campo YA es el nombre nuevo.
    setForm({ abierto: false, nombre: inicial ? limpio : '' })
  }
  const alTeclear = (e: KeyboardEvent) => { if (e.key === ENTER) void confirmar() }
  // Deshabilitado en blanco: el CHECK `vista_nombre_no_vacio` lo rechazaría en la base, y un
  // error de Postgres no es forma de decir «poné un nombre».
  const pie = (
    <><Button kind="cancel" onClick={cerrar} />
      <Button kind="confirm" label={t(SAVE_KEY)} deshabilitado={!limpio} onClick={() => void confirmar()} /></>
  )

  return (
    <>
      <Button kind={kind} label={rotulo} iconOnly={iconOnly} onClick={abrir} />
      {abierto && (
        <Modal title={rotulo} anchoRem={MODAL_REM} onClose={cerrar} footer={pie}>
          <Field label={t(FIELD_KEY)} required>
            <input value={nombre} autoFocus onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} onKeyDown={alTeclear} />
          </Field>
        </Modal>
      )}
    </>
  )
}

// Ponerle nombre a una vista: al crearla o al corregirlo después. Las dos pasan por el MISMO
// diálogo — nombrar algo es nombrar algo, y que crear abriera un formulario y renombrar otro
// distinto serían dos maneras de hacer lo mismo.
//
// Va en un `Modal` y no en un desplegable ni en un `prompt()`. El `prompt()` del navegador bloquea
// el hilo, no se puede traducir y no hay forma de probarlo. El desplegable —que es lo que había—
// hacía que renombrar abriera un menú adentro de otro menú, y dejaba el campo y su confirmación al
// costado de la pantalla: guardar una vista es un acto con nombre propio, y merece que la pantalla
// se detenga en él con su Cancelar y su Guardar a la vista.
//
// El campo es `Field`, el mismo de los formularios. Cuando esto vivía en la barra no servía —era
// un control al costado, con el rótulo al lado y sin validación—; adentro de un diálogo es
// exactamente lo que `Field` resuelve: rótulo arriba, asterisco de obligatorio, y el control
// estilizado sin repetir la regla. El cambio de forma volvió cierto lo que antes no lo era.
