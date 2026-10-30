import { createElement } from 'react'
import { Button } from '@/shared/components/ui'
import DAY_SECTION_CONSTANTS from '../constants'
import type { AddRangeButtonProps } from '../types'
import s from './index.module.css'

export default function AddRangeButton(props: AddRangeButtonProps) {
  const { label, onAdd } = props
  const buttonProps = {
    kind: DAY_SECTION_CONSTANTS.addButtonKind,
    label,
    onClick: onAdd,
  }
  const addButton = createElement(Button, buttonProps)

  return <div className={s.wrap}>{addButton}</div>
}

// AddRangeButton provides the scoped secondary action for one weekday.
