'use client'
import { cloneElement, useId } from 'react'
import FieldFrame from './FieldFrame'
import FieldLabel from './FieldLabel'
import CutNotice from './CutNotice'
import CharCount from './CharCount'
import FieldContext from './field-context'
import nativeChild from './native-child'
import ownLimit from './own-limit'
import useLengthLimit from './useLengthLimit'
import type { ControlProps, FieldProps } from './types'
import s from './index.module.css'

export default function Field(props: FieldProps) {
  const { label, icon, required = false, grande = false, crece = false, error, children } = props
  const generated = useId()
  const errorId = `${generated}-error`
  const native = nativeChild(children)
  const id = native?.props.id ?? generated
  const { limit, cut, report, ids, describedBy, handlers } = useLengthLimit(generated, ownLimit(native?.props))
  const described = error ? [errorId, ...describedBy] : describedBy
  const control: ControlProps = {
    id,
    'aria-required': required || undefined,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': described.length > 0 ? described.join(' ') : undefined,
    ...handlers,
  }
  const channel = { control, report }

  return (
    <FieldFrame className={`${grande ? s.grande : ''} ${crece ? s.crece : ''}`} errorId={errorId} error={error}>
      <FieldLabel htmlFor={id} label={label} icon={icon} required={required} />
      <FieldContext.Provider value={channel}>
        {native ? cloneElement(native, control) : children}
      </FieldContext.Provider>
      {limit && <CutNotice id={ids.cut} cut={cut} field={label} max={limit.max} />}
      {limit && <CharCount id={ids.count} length={limit.length} max={limit.max} />}
    </FieldFrame>
  )
}

// A form field: its label, its control and its error. The label NAMES the control —`htmlFor` to
// the control's id—, which is what a screen reader reads and what makes a click on the text put
// the cursor in the box. A native tag placed inside gets the id from the Field itself; a
// component that draws its control asks for it with `useFieldControl`. The required asterisk and
// the icon belong to the component, not to each form (nor to the i18n key).
//
// A box with a `maxLength` also gets, under it, the count once it nears the limit and a notice
// when a paste is cut: every form with a limited box gets both without asking. They are added
// to the control's description after the error, never in its place.
