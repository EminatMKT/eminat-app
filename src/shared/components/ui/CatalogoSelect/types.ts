import type { I18nKey } from '@/shared/i18n'

/** What `catalogoMeta` returns, seen from outside: the list and how each value is translated. */
export type Catalog<V extends string> = {
  valores: V[]
  label: (v: string | undefined, t: (k: I18nKey) => string) => string
}

export type Props<V extends string> = {
  catalogo: Catalog<V>
  valor: V
  /** The control's accessible name. It goes to `aria-label` because these selects live in rows
   *  read straight through, with no visible label: without it they are a nameless dropdown. */
  etiqueta: string
  onChange: (v: V) => void
  /** The blank first choice, for a form that creates. Left out when the value already exists. */
  placeholder?: string
  className?: string
}
