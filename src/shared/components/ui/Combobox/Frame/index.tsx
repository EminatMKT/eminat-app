'use client'
import type { ChangeEvent } from 'react'
import useFieldControl from '@/shared/components/ui/Field/useFieldControl'
import Panel from '../Panel'
import type { FrameProps } from './types'
import s from '../index.module.css'

export default function Frame(props: FrameProps) {
  const { combo, value, placeholder, ariaLabel, multiple = false, empty, children } = props
  const named = useFieldControl()
  const { open, listId } = combo
  const arrowClass = open ? `${s.flecha} ${s.abierta}` : s.flecha
  const onChange = ({ target }: ChangeEvent<HTMLInputElement>) => combo.onType(target.value)
  return (
    <div className={s.raiz} ref={combo.root}>
      <input aria-label={ariaLabel} {...named} className={s.caja} role="combobox" aria-autocomplete="list"
        aria-expanded={open} aria-controls={listId} aria-activedescendant={combo.activeId}
        readOnly={multiple && !open} value={value} placeholder={placeholder} onFocus={combo.onOpen}
        onClick={combo.onOpen} onKeyDown={combo.onKeyDown} onChange={onChange} />
      <span className={arrowClass} aria-hidden>▼</span>
      {open && (
        <Panel id={listId} multiple={multiple} hasRows={combo.shown.length > 0} empty={empty}>{children}</Panel>
      )}
    </div>
  )
}

// The box, its arrow and the list under it, shared by the free-text and the multiple combobox.
// Inside a Field the box takes the id the label points at, and it is styled by the Field's own
// `.campo input` rule —the same box, border, radius and font as the Field's native select—, so a
// combobox next to a select reads as the same kind of control. While a multiple one is closed the
// box shows the caller's summary read-only; focus, a click, Enter, Space or ArrowDown open it.
