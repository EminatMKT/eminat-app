import { expect, it } from 'vitest'
import shapes from './shapes'

const t = (key: string) => key
const ageBuckets = {
  child: 40,
  youngAdult: 150,
  adult: 180,
  olderAdult: 90,
  senior: 40,
  unknown: 0,
}
const counts = {
  gender: { female: 260, male: 230, unknown: 10 },
  ageBuckets,
  areaCodes: [{ code: '305', label: 'Miami-Dade', count: 220 }],
}

it('drops the unknown-gender slice once nobody is in it', () => {
  const noUnknown = { ...counts, gender: { female: 260, male: 230, unknown: 0 } }
  const data = shapes.genderChartData(noUnknown, t)
  expect(data.map((item) => item.name)).not.toContain('med.dashboardGenderUnknown')
})

it('keeps every gender slice that has at least one patient', () => {
  const data = shapes.genderChartData(counts, t)
  expect(data).toHaveLength(3)
})

it('keys the gender colors by the same translated labels as the chart data', () => {
  const colors = shapes.genderChartColors(t)
  const labels = ['med.dashboardGenderFemale', 'med.dashboardGenderMale', 'med.dashboardGenderUnknown']
  expect(Object.keys(colors)).toEqual(labels)
})

it('orders the five age buckets youngest to oldest', () => {
  const data = shapes.ageBucketChartData(counts, t)
  expect(data.map((item) => item.value)).toEqual([40, 150, 180, 90, 40])
})

it('labels each area-code bar with its code and county', () => {
  const data = shapes.areaChartData(counts)
  expect(data).toEqual([{ name: '305 Miami-Dade', value: 220 }])
})
