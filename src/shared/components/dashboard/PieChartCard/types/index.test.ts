import { expect, it } from 'vitest'
import type { Datum, Props } from './index'

it('carries one slice of the pie: its name and its value', () => {
  const datum: Datum = { name: 'payroll', value: 10 }
  expect(datum.value).toBe(10)
})

it('donut and centerLabel are both optional — a filled pie needs neither', () => {
  const props: Props = {
    title: 'Totals',
    persistKey: 'p',
    data: [],
    colors: {},
  }
  expect(props.donut).toBeUndefined()
  expect(props.centerLabel).toBeUndefined()
})
