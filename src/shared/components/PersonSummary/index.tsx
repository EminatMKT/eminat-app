import type { Props } from './types'
import Avatar from '@/shared/components/Avatar'
import s from './index.module.css'

function rowClassOf(className?: string): string {
  const base = `${s.row} ${s.name}`
  const rowClass = className ? `${base} ${className}` : base

  return rowClass
}

/** Avatar plus a name/subtitle row: the shared identity block for anywhere a person needs
 *  showing, not only the subject of an action. The name shares its wrapper with the row's own
 *  flex layout; the subtitle, when given, is a sibling line below it. */
export default function PersonSummary(props: Props) {
  const { name, subtitle, className, ...avatar } = props

  return <>
    <div className={rowClassOf(className)}><Avatar {...avatar} />{name}</div>
    {subtitle && <div className={s.subtitle}>{subtitle}</div>}
  </>
}

// Presentation-only: it composes the shared Avatar with name/subtitle text and touches no i18n
// or domain logic — callers resolve initials, color and copy before reaching this.
