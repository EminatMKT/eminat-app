import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import useCalendarPeriod from './index'

type ProbeProps = { today: string }

function Probe({ today }: ProbeProps) {
  const [period] = useCalendarPeriod(today)
  return <>{period}</>
}

describe('useCalendarPeriod', () => {
  it('starts on the month the given date falls in', () => {
    expect(renderToStaticMarkup(<Probe today="2026-09-23" />)).toBe('2026-09-01')
  })
})
