import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import patientDashboardCounts from '@/features/medical/data/patientDashboardCounts'
import type { PatientDashboardCounts } from '@/features/medical/data/patientDashboardCounts/types'
import usePatientDashboardAggregate from './index'

vi.mock('@/features/medical/data/patientDashboardCounts', () => ({ default: vi.fn() }))

const fixtureCounts: PatientDashboardCounts = {
  totalPatients: 7101,
  withEmail: 4200,
  withoutEmail: 2901,
  medianAge: null,
  minAge: null,
  maxAge: null,
  birthdaysThisMonth: null,
  birthdaysByMonth: null,
  gender: {
    female: 3500,
    male: 3400,
    unknown: 201,
  },
  ageBuckets: {
    child: 100,
    youngAdult: 2000,
    adult: 3000,
    olderAdult: 1500,
    senior: 500,
    unknown: 1,
  },
  areaCodes: [
    { code: '786', label: 'Miami-Dade', count: 4000 },
  ],
  dataQuality: {
    missingEmail: 2901,
    sharedPhone: null,
    sharedEmail: null,
    repeatedName: null,
    typoEmailDomain: null,
  },
}

let seen: ReturnType<typeof usePatientDashboardAggregate> | null = null
function Probe() {
  seen = usePatientDashboardAggregate()
  return null
}

describe('usePatientDashboardAggregate', () => {
  beforeEach(() => {
    seen = null
    vi.mocked(patientDashboardCounts).mockReset().mockResolvedValue(fixtureCounts)
    renderToStaticMarkup(<Probe />)
  })

  it('starts out loading, with nothing loaded and nothing wrong', () => {
    expect(seen?.loading).toBe(true)
    expect(seen?.counts).toBeNull()
    expect(seen?.error).toBeNull()
  })

  // Static markup never runs the mount effect, so this only proves the hook does not fetch
  // synchronously during render — same limit documented on useBillingV2Records' own test.
  it('reaches the network on no render of its own', () => {
    expect(vi.mocked(patientDashboardCounts)).not.toHaveBeenCalled()
  })

  it('offers reload as part of the contract', () => {
    expect(typeof seen?.reload).toBe('function')
  })

  it('loads the dashboard counts when reload runs', async () => {
    await seen?.reload()
    expect(vi.mocked(patientDashboardCounts)).toHaveBeenCalledTimes(1)
  })

  it('catches a failed load instead of throwing past the hook', async () => {
    vi.mocked(patientDashboardCounts).mockRejectedValueOnce(new Error('network down'))
    await expect(seen?.reload()).resolves.not.toThrow()
  })
})
