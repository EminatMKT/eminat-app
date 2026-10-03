import { describe, expect, it } from 'vitest'
import type { ActivityRowWithEmbed, OptimisticUpdateResult } from './index'

describe('actividades types', () => {
  it('keeps the embed optional so a task with nobody still type-checks', () => {
    const bare: ActivityRowWithEmbed = { id: 'act-1' }

    expect(bare.actividad_responsables).toBeUndefined()
  })

  it('lets a plain save leave the conflicting row out', () => {
    const saved: OptimisticUpdateResult = { data: null, error: null, conflict: false }

    expect(saved.current).toBeUndefined()
  })
})
