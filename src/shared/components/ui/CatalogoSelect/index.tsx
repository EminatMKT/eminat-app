'use client'
import { useT } from '@/shared/i18n'
import Select from '@/shared/components/ui/Select'
import type { Props } from './types'

/** A `<select>` over a META catalog. The only `as` lives in here and not in every consumer:
 *  `e.target.value` is a `string` to the DOM, and the generic hands it back as its union. */
export default function CatalogoSelect<V extends string>(props: Props<V>) {
  const { catalogo, valor, etiqueta, onChange, placeholder, className } = props
  const { t } = useT()

  return (
    <Select className={className} aria-label={etiqueta} value={valor} placeholder={placeholder}
      onChange={e => onChange(e.target.value as V)}>
      {catalogo.valores.map(v => <option key={v} value={v}>{catalogo.label(v, t)}</option>)}
    </Select>
  )
}

// The blank choice is not drawn here: `Select` owns it, so this file only draws the options.
// Who asks for it decides — a form that creates passes `placeholder`, and the rows that edit a
// NOT NULL value with a DEFAULT (the participant role and attendance) leave it out.
