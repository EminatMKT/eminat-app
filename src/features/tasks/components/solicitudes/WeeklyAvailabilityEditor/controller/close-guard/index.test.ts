import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import type { ControllerResult } from '../types'
import useCloseGuard from './index'

type Guard = Pick<ControllerResult, 'isDirty' | 'onSave'>

let seen: ReturnType<typeof useCloseGuard> | null = null

function Probe(props: { guard: Guard; onClose: () => void }) {
  seen = useCloseGuard(props.guard, props.onClose)

  return null
}

function renderGuard(isDirty: boolean, onSave: () => Promise<boolean>, onClose: () => void) {
  const guard: Guard = { isDirty, onSave }
  const probeProps = { guard, onClose }

  renderToStaticMarkup(createElement(Probe, probeProps))
}

describe('useCloseGuard', () => {
  it('closes immediately when nothing is dirty', () => {
    const onClose = vi.fn()

    renderGuard(false, vi.fn(), onClose)
    seen?.requestClose()

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('holds the dialog open instead of closing when dirty', () => {
    const onClose = vi.fn()

    renderGuard(true, vi.fn(), onClose)
    seen?.requestClose()

    expect(onClose).not.toHaveBeenCalled()
  })

  it('discard closes without waiting for a save', () => {
    const onClose = vi.fn()

    renderGuard(true, vi.fn(), onClose)
    seen?.dialogProps.onDiscard()

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('save-and-exit closes once the save resolves true', async () => {
    const onClose = vi.fn()

    renderGuard(true, vi.fn().mockResolvedValue(true), onClose)

    await seen?.dialogProps.onSaveAndExit()

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('save-and-exit stays open when the save resolves false', async () => {
    const onClose = vi.fn()

    renderGuard(true, vi.fn().mockResolvedValue(false), onClose)

    await seen?.dialogProps.onSaveAndExit()

    expect(onClose).not.toHaveBeenCalled()
  })

  it('keep-editing never closes', () => {
    const onClose = vi.fn()

    renderGuard(true, vi.fn(), onClose)
    seen?.dialogProps.onKeepEditing()

    expect(onClose).not.toHaveBeenCalled()
  })
})

// Covers only what renderToStaticMarkup can observe: onClose called or not, per guarded action.
