'use client'
import { useT } from '@/shared/i18n'
import { CatalogoSelect, PillToggle } from '@/shared/components/ui'
import CONTROL from '../control-kinds'
import choiceCatalog from '../choice-catalog'
import TextControl from '../TextControl'
import type { FieldProps } from '../types'

export default function FieldControl({ spec, form, onEdit }: FieldProps) {
  const { t } = useT()
  const { name, control, labelKey, options = [] } = spec
  const value = form[name]
  const on = value === true
  const text = String(value)
  const set = (next: string) => onEdit(name, next)

  if (control === CONTROL.toggle) {
    const label = t(on ? 'billing.followUp.on' : 'billing.followUp.off')
    return <PillToggle label={label} active={on} onClick={() => onEdit(name, !on)} />
  }
  if (control === CONTROL.select) {
    return <CatalogoSelect catalogo={choiceCatalog(options)} valor={text} etiqueta={t(labelKey)}
      placeholder={t('common.select')} onChange={set} />
  }
  return <TextControl kind={control} value={text} onChange={set} multiline={control === CONTROL.textarea} />
}

// One field spec in, the control it asks for out. Every control is a shared or billing piece that
// already exists — the closed lists go through `CatalogoSelect`, with a blank first choice because
// this form creates records and nothing may look picked before somebody picks it. The marker is a
// switch and not a checkbox, so its state is said in words next to it.
