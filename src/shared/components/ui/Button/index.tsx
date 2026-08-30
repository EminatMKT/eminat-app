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
}

export default function Button({ kind, onClick, label, ocupado = false, ocupadoLabel }: Props) {
  const { t } = useT()
  const { icono, labelKey, tono } = BUTTON_META[kind]
  const rotulo = ocupado ? (ocupadoLabel ?? t('common.loading')) : (label ?? t(labelKey))

  return (
    <button type="button" className={`${s.base} ${s[tono]}`} onClick={onClick} disabled={ocupado}>
      {icono && <span aria-hidden="true">{icono}</span>}
      {rotulo}
    </button>
  )
}
