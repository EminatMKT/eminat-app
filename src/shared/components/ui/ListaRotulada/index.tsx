import type { ReactNode } from 'react'
import s from './index.module.css'

type Props = {
  children?: ReactNode
  className?: string
  /** Shown in place of the list when the caller has no rows to draw (e.g. a search with no matches). */
  emptyLabel?: string
  label: string
}

/** Shared named list wrapper for screens that render UI rows; callers keep only row content. */
export default function ListaRotulada(props: Props) {
  const {
    children,
    className,
    emptyLabel,
    label,
  } = props
  if (emptyLabel) return <p className={s.vacio}>{emptyLabel}</p>
  return <ul aria-label={label} className={`${s.lista} ${className ?? ''}`}>{children}</ul>
}

// ListaRotulada owns the repeated labelled <ul> and its empty message; row components own their
// own content.
