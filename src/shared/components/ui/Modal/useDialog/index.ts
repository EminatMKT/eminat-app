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

/** `open` is for a box that is a dialog only at times —a drawer—; a modal is open while mounted. */
export default function useDialog(onClose: () => void, open = true) {
  const ref = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const opening = () => ({ open, opener: open ? asElement(focused()) : null })
  const [seen, setSeen] = useState(opening)
  if (seen.open !== open) setSeen(opening())
  const { opener } = seen

  useEffect(() => {
    const box = ref.current
    if (!open || !box) return
    const first = focusables(box).find((control) => !control.closest(HEAD))
    return holdFocus({ box, first, active: focused(), opener })
  }, [open, opener])

  const onKeyDown = (event: KeyboardEvent) => dialogKeys(
    { key: event.key, shiftKey: event.shiftKey, cancel: () => event.preventDefault(), stop: () => event.stopPropagation() },
    { items: ref.current ? focusables(ref.current) : [], active: focused(), onClose },
  )

  const plain = { ref }
  const modal = { ref, tabIndex: -1, 'aria-modal': true, onKeyDown }
  return { titleId, box: open ? modal : plain }
}

// The runtime half of a modal dialog, written once for every modal of the app. The opener is
// read while the dialog RENDERS, not in the effect: by then a field with `autoFocus` has already
// taken the focus, and the control that opened the dialog would be lost. The effect moves the
// focus in —to the first control outside the header, or to the box— and its cleanup gives it
// back. The keys go to `dialogKeys`, which knows nothing of React. A box that stays mounted and
// is a dialog only at times —the phone drawer— passes `open`: the opener is then read on the
// render where `open` turns true, and closing runs the same cleanup a modal's unmount does.
