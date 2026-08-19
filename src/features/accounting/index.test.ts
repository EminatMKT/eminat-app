import { describe, it, expect } from 'vitest'
import * as accounting from './index'
import { totals } from './aggregates'

describe('features/accounting API pública', () => {
  it('expone AccountingModule', () => {
    expect(accounting.AccountingModule).toBeDefined()
  })
  it('declara su access (convención access-aware)', () => {
    expect(accounting.access).toEqual({ module: 'accounting' })
  })
  it('los agregados suman cobrar = vencido + por vencer', () => {
    expect(totals.totalCobrar).toBe(totals.totalVencido + totals.totalPorVencer)
  })
})
