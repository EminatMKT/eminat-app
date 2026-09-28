import type { I18nKey } from '@/shared/i18n'

/** What `catalogoMeta` returns, seen from outside: the list and how each value is translated. */
export type Catalog<V extends string> = {
  valores: V[]
  label: (v: string | undefined, t: (k: I18nKey) => string) => string
}

type Shared<V extends string> = {
  catalogo: Catalog<V>
  valor: V
  /** The control's accessible name. It goes to `aria-label` because these selects live in rows
   *  read straight through, with no visible label: without it they are a nameless dropdown. */
  etiqueta: string
  className?: string
}

/** A select in a form that creates: it draws a blank first choice, which can be picked back and
 *  then arrives as `''`. */
export type Creating<V extends string> = Shared<V> & {
  placeholder: string
  onChange: (v: V | '') => void
}

/** A select over a value that already exists: no blank choice, so only members arrive. */
export type Editing<V extends string> = Shared<V> & {
  placeholder?: undefined
  onChange: (v: V) => void
}

export type Props<V extends string> = Creating<V> | Editing<V>
