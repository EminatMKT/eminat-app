'use client'
import { useState, type ReactNode } from 'react'
import Frame from '../Frame'
import Option from '../Option'
import useCombobox from '../useCombobox'
import type { ComboOption, ComboSearch } from '../types'

type Props = {
  options: ComboOption[]
  /** The ids that are in. */
  selected: readonly string[]
  onToggle: (id: string) => void
  /** What the closed box reads: a placeholder when nothing is in, else the caller's summary. */
  display: string
  /** What the open, empty box reads while it waits for a search. */
  searchPlaceholder?: string
  /** A control of one option, drawn beside its label. */
  action?: (option: ComboOption) => ReactNode
  /** What the panel says when nothing shows. */
  empty: (search: ComboSearch) => ReactNode
}

const NO_QUERY = ''
const byLabel = ({ label }: ComboOption) => label

export default function MultiCombobox(props: Props) {
  const { options, selected, onToggle, display, searchPlaceholder, action, empty } = props
  const [query, setQuery] = useState(NO_QUERY)
  const config = {
    options,
    query,
    onType: setQuery,
    onPick: ({ id }: ComboOption) => onToggle(id),
    multiple: true,
    text: byLabel,
  }
  const combo = useCombobox(config)
  const search = { query, clear: () => setQuery(NO_QUERY) }
  const boxText = combo.open ? query : display
  return (
    <Frame combo={combo} multiple value={boxText} placeholder={searchPlaceholder} empty={empty(search)}>
      {combo.shown.map((option, i) => (
        <Option key={option.id} id={`${combo.listId}-${i}`} label={option.label} marked={i === combo.active}
          checked={selected.includes(option.id)} action={action?.(option)} onPick={() => combo.pick(option)} />
      ))}
    </Frame>
  )
}

// Several ids picked from one box. Closed, it reads like a select: the caller's summary of who is
// in. Open, the same box is the search, each option toggles on a press or on Enter, and the panel
// stays open so several can be picked in a row. Each option can carry its own control.
