'use client'
import { useT, type I18nKey } from '@/shared/i18n'
import Select from '@/shared/components/ui/Select'

/** Lo que devuelve `catalogoMeta`, visto desde afuera: la lista y cómo se traduce. */
type Catalogo<V extends string> = {
  valores: V[]
  label: (v: string | undefined, t: (k: I18nKey) => string) => string
}

type Props<V extends string> = {
  catalogo: Catalogo<V>
  valor: V
  /** Cómo se llama el control. Va de `aria-label` porque estos selects viven en filas que se
   *  leen de corrido y no tienen rótulo visible: sin esto son un desplegable sin nombre. */
  etiqueta: string
  onChange: (v: V) => void
  /** The blank first choice, for a form that creates. Left out when the value already exists. */
  placeholder?: string
  className?: string
}

/** Un `<select>` sobre un catálogo META. El único `as` vive acá adentro y no en cada consumidor:
 *  `e.target.value` es `string` para el DOM, y el genérico lo devuelve a su unión. */
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
