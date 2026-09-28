import s from '../index.module.css'

type Props = {
  /** The id of the control this label names. */
  htmlFor: string
  label: string
  /** Emoji beside the text. Decorative: it stays out of the name. */
  icon?: string
  required?: boolean
}

export default function FieldLabel({ htmlFor, label, icon, required = false }: Props) {
  return (
    <label htmlFor={htmlFor} className={s.label} data-required={required || undefined}>
      {icon && <span aria-hidden="true">{icon} </span>}
      {label}
    </label>
  )
}

// The visible name of a Field, tied to its control by `htmlFor` — so clicking the text puts the
// cursor in the box, and a screen reader reads it as the box's name. The asterisk is drawn by the
// stylesheet from `data-required`; the control itself says it with `aria-required`.
