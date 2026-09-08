'use client'
import { useT } from '@/shared/i18n'
import { BUTTON_META } from './meta'
import type { ButtonKind } from './types'
import s from './index.module.css'

// UN botón para las cinco acciones del repo. Reemplaza a NewButton, EditButton, DeleteButton,
// CancelButton y ConfirmButton, que eran cinco componentes con cinco `.module.css` repitiendo
// el mismo padding, radio, tipografía y anillo de foco.
//
// Lo que hace viable fusionarlos es la unión discriminada: con `variant: string` un typo
// devolvía un botón sin estilo y nada fallaba; con `kind: ButtonKind`, `kind="nwe"` no compila.
// Y lo propio de cada uno —ícono, rótulo por defecto, tono— sale de `BUTTON_META`, que es el
// mismo patrón con el que este repo enumera todo lo demás. Agregar una clase de botón es
// agregar una fila, no un componente.

type Props = {
  kind: ButtonKind
  onClick: () => void
  /** Sólo cuando la acción necesita decir QUÉ opera ("Nueva reunión", "Editar tarea"). */
  label?: string
  /** Mientras la acción corre: deshabilita y cambia el rótulo. Un solo prop para las dos cosas
   *  —separarlos dejaba habilitar un botón que dice "Guardando…", que es como se guarda dos veces. */
  ocupado?: boolean
  ocupadoLabel?: string
  /** Deshabilitado por una CONDICIÓN, no por estar trabajando: falta escribir la frase de
   *  confirmación, falta un campo. Es distinto de `ocupado` — el rótulo no cambia y el cursor no
   *  dice "esperá", dice "todavía no". */
  deshabilitado?: boolean
  /** Sólo el ícono, con el rótulo como nombre accesible. Para cuando el botón vive en una fila
   *  angosta —un menú, una tarjeta— y el rótulo entero la rompería. */
  iconOnly?: boolean
  /** El botón es un INTERRUPTOR y está prendido. Sin esto, un botón que alterna algo no dice en
   *  qué estado quedó: se apaga y se prende igual, y el lector de pantalla no lo anuncia. */
  pressed?: boolean
}

export default function Button(props: Props) {
  const { kind, onClick, label, ocupado = false, ocupadoLabel, deshabilitado = false } = props
  const { iconOnly = false, pressed } = props
  const { t } = useT()
  const { icono, labelKey, tono } = BUTTON_META[kind]
  const rotulo = ocupado ? (ocupadoLabel ?? t('common.loading')) : (label ?? t(labelKey))
  // Sin ícono no hay modo ícono: quedaría un botón vacío. Los `kind` sin símbolo —`cancel`,
  // `confirm`— se dibujan con su rótulo aunque se lo pidan al revés.
  const soloIcono = iconOnly && !!icono

  return (
    <button type="button" onClick={onClick} disabled={ocupado || deshabilitado} aria-busy={ocupado}
      className={`${s.base} ${s[tono]}${soloIcono ? ` ${s.icono}` : ''}${pressed ? ` ${s.prendido}` : ''}`}
      aria-label={soloIcono ? rotulo : undefined} aria-pressed={pressed}>
      {icono && <span aria-hidden="true">{icono}</span>}
      {!soloIcono && rotulo}
    </button>
  )
}
