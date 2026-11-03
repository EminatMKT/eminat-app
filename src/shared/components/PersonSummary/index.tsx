import type { Props } from './types'
import Avatar from '@/shared/components/Avatar'
import s from './index.module.css'

/** Avatar plus a name/subtitle row: the shared identity block for anywhere a person needs
 *  showing, not only the subject of an action. The name shares its wrapper with the row's own
 *  flex layout; the subtitle, when given, is a sibling line below it. */
export default function PersonSummary(props: Props) {
  const {
    initials,
    size,
    color,
    tone,
    status,
    name,
    subtitle,
    className,
  } = props
  const rowClass = className ? `${s.row} ${s.name} ${className}` : `${s.row} ${s.name}`

  return (
    <>
      <div className={rowClass}>
        <Avatar
          initials={initials}
          size={size}
          color={color}
          tone={tone}
          status={status}
        />
        {name}
      </div>
      {subtitle && <div className={s.subtitle}>{subtitle}</div>}
    </>
  )
}

// Presentation-only: it composes the shared Avatar with name/subtitle text and touches no i18n
// or domain logic — callers resolve initials, color and copy before reaching this.
