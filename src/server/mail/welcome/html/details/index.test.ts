import { describe, it, expect } from 'vitest'
import details from '.'

const PERSON = {
  email: 'ana@eminat.net',
  password: 'p<ss>word',
  areaLabel: 'Marketing',
}

describe('welcome details block', () => {
  it('shows the area, the email and the escaped temporary password', () => {
    const html = details(PERSON)
    expect(html).toContain('Marketing')
    expect(html).toContain('ana@eminat.net')
    expect(html).toContain('p&lt;ss&gt;word')
  })
  it('adds the cargo line only when there is a cargo', () => {
    expect(details(PERSON)).not.toContain('#A5A7FF')
    expect(details({ ...PERSON, cargo: 'Editor & QA' })).toContain('Editor &amp; QA')
  })
})
