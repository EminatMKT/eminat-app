'use client'
import type { ReactNode } from 'react'
import { useT, type I18nKey } from '@/shared/i18n'
import Frame from './Frame'
import Option from './Option'
import useCombobox from './useCombobox'

type Props = {
  /** What opening offers. What was typed counts even when it is not on the list. */
  options: string[]
  value: string
  onChange: (v: string) => void
  placeholder?: string
  /** The control's name for a screen reader, when no `Field` label names it. */
  ariaLabel?: string
  /** The option that goes on top and in bold, when the typed text lets it through. */
  pinned?: string
  /** What the panel shows when nothing matches. The default is a dead end, which is wrong
   *  wherever typing a new value is the point, so the caller can say something else. */
  vacio?: ReactNode
}

const NO_MATCHES: I18nKey = 'common.combobox.noMatches'

export default function Combobox(props: Props) {
  const { options, value, onChange, placeholder, ariaLabel, pinned, vacio } = props
  const { t } = useT()
  const config = {
    options,
    query: value,
    onType: onChange,
    onPick: onChange,
    pinned,
  }
  const combo = useCombobox(config)
  const empty = vacio ?? t(NO_MATCHES)
  return (
    <Frame combo={combo} value={value} placeholder={placeholder} ariaLabel={ariaLabel} empty={empty}>
      {combo.shown.map((option, i) => (
        <Option key={option} id={`${combo.listId}-${i}`} label={option} marked={i === combo.active}
          pinned={option === pinned} onPick={() => combo.pick(option)} />
      ))}
    </Frame>
  )
}

// Pick from a list or type something that is not on it, in one box. It replaces the native
// datalist, which does not open on focus and only matches the start of a label. The version that
// picks several ids, with a box per option, is `MultiCombobox`, on the same hook and frame.
