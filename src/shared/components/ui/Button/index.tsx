'use client'
import type { MouseEvent } from 'react'
import { useT } from '@/shared/i18n'
import { BUTTON_META } from './meta'
import type { ButtonKind } from './types'
import s from './index.module.css'

type Props = {
  kind: ButtonKind
  onClick: () => void
  label?: string
  ocupado?: boolean
  ocupadoLabel?: string
  deshabilitado?: boolean
  iconOnly?: boolean
  pressed?: boolean
  stopPropagation?: boolean
}

export default function Button(props: Props) {
  const { kind, onClick, label, ocupado = false, ocupadoLabel, deshabilitado = false } = props
  const { iconOnly = false, pressed, stopPropagation = false } = props
  const { t } = useT()
  const { icono, labelKey, tono } = BUTTON_META[kind]
  const rotulo = ocupado ? (ocupadoLabel ?? t('common.loading')) : (label ?? t(labelKey))
  const soloIcono = iconOnly && !!icono
  const click = (e: MouseEvent<HTMLButtonElement>) => {
    if (stopPropagation) e.stopPropagation()
    onClick()
  }

  return (
    <button type="button" onClick={click} disabled={ocupado || deshabilitado} aria-busy={ocupado}
      className={`${s.base} ${s[tono]}${soloIcono ? ` ${s.icono}` : ''}${pressed ? ` ${s.prendido}` : ''}`}
      aria-label={soloIcono ? rotulo : undefined} aria-pressed={pressed}
      title={soloIcono ? rotulo : undefined}>
      {icono && <span aria-hidden="true">{icono}</span>}
      {!soloIcono && rotulo}
    </button>
  )
}
