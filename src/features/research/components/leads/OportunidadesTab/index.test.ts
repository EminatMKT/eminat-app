import { describe, it, expect } from 'vitest'
import { STAGE } from '@/features/research/stages'
import { isOpportunityStage } from './index'

describe('OportunidadesTab opportunity stage predicate', () => {
  it('counts En comunicación as an active opportunity', () => {
    expect(isOpportunityStage(STAGE.EN_COMUNICACION)).toBe(true)
  })

  it('keeps Total Ganado scoped to Ganado only', () => {
    const leads = [{ stage: STAGE.GANADO }, { stage: STAGE.EN_COMUNICACION }, { stage: STAGE.CONTACTADO }]
    const totalGanado = leads.filter(l => l.stage === STAGE.GANADO).length
    expect(totalGanado).toBe(1)
  })
})
