'use client'
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useApp } from '@/shared/context/AppContext'
import { BUTTON_META } from '../Button/meta'
import type { ButtonKind } from '../Button/types'
import { positionMenu } from './position'
import styles from './menu.module.css'

export type RowMenuItem = {
  label: string
  onClick: () => void
  danger?: boolean
  kind?: ButtonKind
}

// Keep the panel outside table overflow and transformed parent stacking contexts.
// Measure its actual content before paint, then flip and constrain it to the viewport.
export default function RowMenu({ items, label }: { items: RowMenuItem[]; label: string }) {
  const { s1, s2, border, t1, t2 } = useApp()
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<ReturnType<typeof positionMenu> | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const initialFocus = useRef(0)
  const id = useId()

  const close = useCallback((restoreFocus = false) => {
    setOpen(false)
    setPos(null)
    if (restoreFocus) btnRef.current?.focus({ preventScroll: true })
  }, [])

  const updatePosition = useCallback(() => {
    const trigger = btnRef.current?.getBoundingClientRect()
    const panel = panelRef.current
    if (!trigger || !panel) return
    const visual = window.visualViewport
    const viewport = {
      top: visual?.offsetTop ?? 0,
      left: visual?.offsetLeft ?? 0,
      width: visual?.width ?? document.documentElement.clientWidth,
      height: visual?.height ?? window.innerHeight,
    }
    if (trigger.bottom < viewport.top || trigger.top > viewport.top + viewport.height) {
      close()
      return
    }
    const rect = panel.getBoundingClientRect()
    const next = positionMenu(trigger, {
      width: rect.width,
      height: panel.scrollHeight + panel.offsetHeight - panel.clientHeight,
    }, viewport)
    setPos(previous => previous && Object.keys(next).every(key => previous[key as keyof typeof next] === next[key as keyof typeof next]) ? previous : next)
  }, [close])

  function focusItem(index: number) {
    const buttons = panelRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')
    if (!buttons?.length) return
    buttons[(index + buttons.length) % buttons.length]?.focus()
  }

  useLayoutEffect(() => {
    if (!open) return
    updatePosition()
  }, [open, updatePosition])

  const positioned = pos !== null
  useLayoutEffect(() => {
    if (!open || !positioned) return
    const buttons = panelRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')
    buttons?.[initialFocus.current < 0 ? buttons.length - 1 : initialFocus.current]?.focus({ preventScroll: true })
  }, [open, positioned])

  useEffect(() => {
    if (!open) return
    const outside = (event: MouseEvent) => {
      const target = event.target as Node
      if (panelRef.current?.contains(target) || btnRef.current?.contains(target)) return
      close()
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close(true) }
    }
    const reposition = (event: Event) => {
      // Scrolling a constrained menu must not close it or move focus out of it.
      if (event.target instanceof Node && panelRef.current?.contains(event.target)) return
      updatePosition()
    }
    const observer = new ResizeObserver(updatePosition)
    if (panelRef.current) observer.observe(panelRef.current)
    if (btnRef.current) observer.observe(btnRef.current)
    document.addEventListener('click', outside, true)
    document.addEventListener('keydown', escape)
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)
    window.visualViewport?.addEventListener('resize', reposition)
    window.visualViewport?.addEventListener('scroll', reposition)
    return () => {
      observer.disconnect()
      document.removeEventListener('click', outside, true)
      document.removeEventListener('keydown', escape)
      window.removeEventListener('resize', reposition)
      window.removeEventListener('scroll', reposition, true)
      window.visualViewport?.removeEventListener('resize', reposition)
      window.visualViewport?.removeEventListener('scroll', reposition)
    }
  }, [open, close, updatePosition])

  function menuKey(event: React.KeyboardEvent<HTMLDivElement>) {
    const buttons = Array.from(panelRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [])
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement)
    if (event.key === 'Tab') { close(true); return }
    const index = event.key === 'ArrowDown' ? current + 1 : event.key === 'ArrowUp' ? current - 1 : event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : null
    if (index !== null) { event.preventDefault(); focusItem(index) }
  }

  return (
    <>
      <button type="button" id={id} ref={btnRef} onClick={event => {
        event.stopPropagation()
        if (open) close()
        else { initialFocus.current = 0; setOpen(true) }
      }} onKeyDown={event => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault()
          initialFocus.current = event.key === 'ArrowUp' ? -1 : 0
          if (open) focusItem(initialFocus.current)
          else setOpen(true)
        }
      }} aria-label={label} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? `${id}-menu` : undefined}
        style={{ padding: '4px 8px', borderRadius: 8, border: 'none', background: open ? s2 : 'transparent', color: t2, cursor: 'pointer', fontSize: 15, lineHeight: 1 }}>
        ⋮
      </button>
      {open && createPortal(
        <div role="menu" id={`${id}-menu`} aria-labelledby={id} ref={panelRef} onKeyDown={menuKey} data-placement={pos?.placement}
          style={{ position: 'fixed', top: pos?.top ?? 0, left: pos?.left ?? 0, visibility: pos ? 'visible' : 'hidden', zIndex: 1000, minWidth: 'min(170px, calc(100vw - 16px))', width: 'max-content', maxWidth: pos?.maxWidth ?? 'calc(100vw - 16px)', maxHeight: pos?.maxHeight, overflowY: 'auto', overflowX: 'hidden', overscrollBehavior: 'contain', background: s1, border: `1px solid ${border}`, borderRadius: 10, padding: 4, boxSizing: 'border-box', boxShadow: '0 8px 24px rgba(0,0,0,0.18)' }}>
          {items.map(it => (
            <button type="button" className={styles.item} key={it.label} role="menuitem" tabIndex={-1} onClick={event => { event.stopPropagation(); close(true); it.onClick() }}
              style={{ display: 'block', width: '100%', textAlign: 'left', overflowWrap: 'anywhere', padding: '7px 10px', borderRadius: 7, border: 'none', background: 'transparent', color: it.danger ? '#F87171' : t1, fontSize: 12, cursor: 'pointer' }}>
              {it.kind && <span aria-hidden="true">{BUTTON_META[it.kind].icono} </span>}{it.label}
            </button>
          ))}
        </div>, document.body
      )}
    </>
  )
}
