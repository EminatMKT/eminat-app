import { describe, expect, it } from 'vitest'
import { anchoredUtc, serverTimeAnchor, WORLD_ZONES, worldTime } from './clock'

describe('World clock time reference and IANA rules', () => {
  it.each([
    ['2026-01-01T12:00:00Z', ['7:00 AM', '1:00 PM', '7:00 AM', '8:00 AM', '6:00 AM', '7:00 AM', '6:00 AM']],
    ['2026-07-01T12:00:00Z', ['8:00 AM', '2:00 PM', '7:00 AM', '8:00 AM', '6:00 AM', '8:00 AM', '6:00 AM']],
  ])('resolves all seven locations at %s independently of device timezone', (iso, expected) => {
    expect(WORLD_ZONES.map(zone => worldTime(new Date(iso), zone.timeZone))).toEqual(expected)
  })
  it.each([
    ['America/New_York', '2026-03-08T06:59:00Z', '2026-03-08T07:00:00Z', '1:59 AM', '3:00 AM'],
    ['Europe/Madrid', '2026-03-29T00:59:00Z', '2026-03-29T01:00:00Z', '1:59 AM', '3:00 AM'],
    ['America/Havana', '2026-03-08T04:59:00Z', '2026-03-08T05:00:00Z', '11:59 PM', '1:00 AM'],
  ])('handles the spring DST transition in %s', (zone, before, after, oldTime, newTime) => {
    expect(worldTime(new Date(before), zone)).toBe(oldTime)
    expect(worldTime(new Date(after), zone)).toBe(newTime)
  })
  it('uses server UTC plus estimated transit and monotonic elapsed time', () => {
    const anchor = serverTimeAnchor(1767225600000, 100, 300)!
    expect(anchor).toEqual({ utcMs: 1767225600100, monotonicMs: 300 })
    expect(anchoredUtc(anchor, 1300).toISOString()).toBe('2026-01-01T00:00:01.100Z')
    expect(anchoredUtc(anchor, 200).getTime()).toBe(anchor.utcMs)
  })
  it.each([null, undefined, '2026-01-01', NaN, Infinity, 9e15])('rejects invalid server samples %s', sample => {
    expect(serverTimeAnchor(sample, 100, 200)).toBeNull()
  })
  it('rejects a reversed monotonic interval', () => {
    expect(serverTimeAnchor(1234, 200, 100)).toBeNull()
  })
})
