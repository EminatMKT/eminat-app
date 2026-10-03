import { describe, it, expect } from 'vitest'
import { MARKETING_INBOX_EMAIL } from '@/shared/constants/contacts'
import WELCOME_COPY from '../copy'
import action from './action'

describe('welcome action block', () => {
  it('has the button into the app and names the inbox to contact', () => {
    const html = action()
    expect(html).toContain(WELCOME_COPY.button)
    expect(html).toMatch(/<a href="https:\/\/[^"]+"/)
    expect(html).toContain(MARKETING_INBOX_EMAIL)
  })
})
