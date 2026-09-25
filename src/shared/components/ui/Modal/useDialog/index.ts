'use client'
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import dialogKeys from '../dialog-keys'
import holdFocus from '../hold-focus'

const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled]):not([type=hidden])',
  'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])',
].join(', ')
/** The zone of the box that the focus skips on open: the ✕ is not where anyone wants to start. */
const HEAD = '[data-dialog-head]'

const focusables = (box: HTMLElement) => Array.from(box.querySelectorAll<HTMLElement>(FOCUSABLE))
const focused = () => (typeof document === 'undefined' ? null : document.activeElement)
/** `node &&` first: on the server `HTMLElement` does not exist, and reading it throws. */
const asElement = (node: Element | null) => (node && node instanceof HTMLElement ? node : null)

export default function useDialog(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const [opener] = useState(() => asElement(focused()))

  useEffect(() => {
    const box = ref.current
    if (!box) return
    const first = focusables(box).find((control) => !control.closest(HEAD))
    return holdFocus({ box, first, active: focused(), opener })
  }, [opener])

  const onKeyDown = (event: KeyboardEvent) => dialogKeys(
    { key: event.key, shiftKey: event.shiftKey, cancel: () => event.preventDefault(), stop: () => event.stopPropagation() },
    { items: ref.current ? focusables(ref.current) : [], active: focused(), onClose },
  )

  return { titleId, box: { ref, tabIndex: -1, 'aria-modal': true, onKeyDown } }
}

// The runtime half of a modal dialog, written once for every modal of the app. The opener is
// read while the dialog RENDERS, not in the effect: by then a field with `autoFocus` has already
// taken the focus, and the control that opened the dialog would be lost. The effect moves the
// focus in —to the first control outside the header, or to the box— and its cleanup gives it
// back. The keys go to `dialogKeys`, which knows nothing of React.
