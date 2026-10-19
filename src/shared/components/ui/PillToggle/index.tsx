'use client'
import useFieldControl from '@/shared/components/ui/Field/useFieldControl'
import s from '@/shared/components/ui/PillToggle/index.module.css'

const SMALL = 'sm'

type Props = {
  label: string
  active: boolean
  // Without this there's nothing to choose: it renders as a value, not as a button.
  onClick?: () => void
  size?: typeof SMALL | 'md'
  color?: string // if the option has a meaningful color (the state it filters by)
  // How many items fall into this option. It sits dimmed next to the label, not inside it:
  // the number answers a different question than the name, and merged together they read
  // like a weird name.
  count?: number
  diff?: boolean // highlights the pill as different from the other side of a comparison — cosmetic
}

export default function PillToggle(props: Props) {
  const {
    label,
    active,
    onClick,
    size = 'md',
    color,
    count,
    diff,
  } = props
  // Inside a Field, its label names the switch (the id it points at); alone, this hands nothing.
  const named = useFieldControl()
  const className = `${s.pill} ${active ? s.on : ''} ${size === SMALL ? s.sm : ''} ${color ? s.tinted : ''} ${diff ? s.diff : ''} ${onClick ? '' : s.estatico}`
  const style = color ? { '--pill-color': color } : undefined
  // Same element always, only the tag changes: control with `onClick`, value without it.
  // The two branches share attributes on purpose; see the footnote before adding one.
  const Tag = onClick ? 'button' : 'span'
  // A button without `type` submits inside a form; canceling the event avoids that
  // without the `type` attribute, which the span doesn't accept.
  const handleClick = onClick
    ? (e: { preventDefault: () => void }) => { e.preventDefault(); onClick() }
    : undefined
  return (
    <Tag
      {...(onClick ? named : undefined)}
      aria-pressed={onClick ? active : undefined}
      onClick={handleClick}
      className={className}
      style={style}
    >
      {label}{count !== undefined && <span className={s.cuenta}>{count}</span>}
    </Tag>
  )
}

// Selection pill: the control that picks "one of these" without opening anything — the
// board's quarters, the Gantt's views. It's the same button on both sides, so it lives
// here and not in a module (see arquitectura.md).
//
// A single element with a dynamic tag only type-checks because button and span receive
// exactly the same attributes. A prop specific to the button (`disabled`, `type`, `form`,
// `name`) breaks that union and forces going back to two separate elements — which
// `markup_dibujado` would block again (see the history in
// `.superpowers/sdd/2026-10-12-motor-duplicados-ambiente/task-12-report-v3.md`).
