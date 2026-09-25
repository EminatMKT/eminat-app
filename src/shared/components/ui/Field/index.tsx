'use client'
import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react'
import FieldFrame from './FieldFrame'
import FieldLabel from './FieldLabel'
import FieldContext from './field-context'
import type { ControlProps } from './types'
import s from './index.module.css'

type Props = {
  label: string
  /** Emoji beside the label. Decorative: it stays out of the accessible name. */
  icon?: string
  required?: boolean
  grande?: boolean
  /** The control grows with its content instead of hiding its beginning. For a title or a URL:
   *  used with a one-row `<textarea>`, which wraps instead of scrolling. */
  crece?: boolean
  /** Why the value is not accepted. Drawn UNDER the control, which gets `aria-invalid` and an
   *  `aria-describedby` pointing at it. Absent or empty: the field is fine. */
  error?: string
  children: ReactNode
}

/** A native tag placed straight inside: the Field names it itself. A component reads the context. */
const nativeChild = (node: ReactNode): ReactElement<ControlProps> | null =>
  isValidElement<ControlProps>(node) && typeof node.type === 'string' ? node : null

export default function Field(props: Props) {
  const { label, icon, required = false, grande = false, crece = false, error, children } = props
  const generated = useId()
  const errorId = `${generated}-error`
  const native = nativeChild(children)
  const id = native?.props.id ?? generated
  const control: ControlProps = {
    id,
    'aria-required': required || undefined,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? errorId : undefined,
  }

  return (
    <FieldFrame className={`${grande ? s.grande : ''} ${crece ? s.crece : ''}`} errorId={errorId} error={error}>
      <FieldLabel htmlFor={id} label={label} icon={icon} required={required} />
      <FieldContext.Provider value={control}>
        {native ? cloneElement(native, control) : children}
      </FieldContext.Provider>
    </FieldFrame>
  )
}

// A form field: its label, its control and its error. The label NAMES the control —`htmlFor` to
// the control's id—, which is what a screen reader reads and what makes a click on the text put
// the cursor in the box. A native tag placed inside gets the id from the Field itself; a
// component that draws its control asks for it with `useFieldControl`. The required asterisk and
// the icon belong to the component, not to each form (nor to the i18n key).
