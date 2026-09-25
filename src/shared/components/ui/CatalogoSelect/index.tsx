'use client'
import { useT } from '@/shared/i18n'
import Select from '@/shared/components/ui/Select'
import type { Creating, Props } from './types'

/** Whether the select draws the blank first choice, and so may hand `''` back. */
function drawsBlank<V extends string>(props: Props<V>): props is Creating<V> {
  return props.placeholder !== undefined
}

/** A `<select>` over a META catalog. What the DOM hands back is a `string`; it reaches the
 *  caller only as the catalog member it matches, or as the blank choice when there is one. */
export default function CatalogoSelect<V extends string>(props: Props<V>) {
  const { catalogo, valor, etiqueta, onChange, placeholder, className } = props
  const { t } = useT()
  const choose = (picked: string) => {
    const member = catalogo.valores.find((value) => value === picked)
    if (member !== undefined) onChange(member)
    else if (!picked && drawsBlank(props)) props.onChange('')
  }

  return (
    <Select className={className} aria-label={etiqueta} value={valor} placeholder={placeholder}
      onChange={e => choose(e.target.value)}>
      {catalogo.valores.map(v => <option key={v} value={v}>{catalogo.label(v, t)}</option>)}
    </Select>
  )
}

// The blank choice is not drawn here: `Select` owns it, so this file only draws the options.
// Who asks for it decides — a form that creates passes `placeholder`, and the rows that edit a
// NOT NULL value with a DEFAULT (the participant role and attendance) leave it out. The change is
// matched against the catalog instead of cast into it, so the union the caller is handed is true.
