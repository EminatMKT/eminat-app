'use client'
import type { MouseEvent } from 'react'
import clsx from 'clsx'
import { useT } from '@/shared/i18n'
import { BUTTON_META } from './meta'
import type { ButtonProps } from './types'
import s from './index.module.css'

/** Shared action control; callers own async work and error feedback, metadata owns primary emphasis. */
export default function Button(props: ButtonProps) {
  const { kind, onClick, label, ocupado = false, ocupadoLabel, deshabilitado = false } = props
  const { iconOnly = false, pressed, stopPropagation = false, disabledReason } = props
  const { t } = useT()
  const { icono, labelKey, tono } = BUTTON_META[kind]
  let idleLabel = label
  if (idleLabel == null) idleLabel = t(labelKey)
  let busyLabel = ocupadoLabel
  if (busyLabel == null) busyLabel = t('common.loading')
  const rotulo = ocupado ? busyLabel : idleLabel
  const soloIcono = iconOnly && !!icono
  const iconTitle = soloIcono ? rotulo : undefined
  let title = iconTitle
  if (deshabilitado && disabledReason != null) title = disabledReason
  const stateClasses = { [s.icono]: soloIcono, [s.prendido]: pressed }
  const classes = clsx(s.base, s[tono], stateClasses)
  const click = (e: MouseEvent<HTMLButtonElement>) => {
    if (stopPropagation) e.stopPropagation()
    onClick()
  }

  return (
    <button type="button" onClick={click} disabled={ocupado || deshabilitado} aria-busy={ocupado}
      className={classes}
      aria-label={soloIcono ? rotulo : undefined} aria-pressed={pressed}
      title={title}>
      {icono && <span aria-hidden="true">{icono}</span>}
      {!soloIcono && rotulo}
    </button>
  )
}

// Action metadata keeps icons and translated labels consistent across buttons and overflow menus.
