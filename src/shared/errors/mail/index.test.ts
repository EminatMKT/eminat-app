import { expect, it } from 'vitest'
import MAIL_ERRORS from '.'

it('names the mail relay failures', () => {
  expect(MAIL_ERRORS.notConfigured).toBe('Email sending is not configured: RESEND_API_KEY is missing.')
  expect(MAIL_ERRORS.missingFields).toBe('Missing required fields: to, subject, html.')
  expect(MAIL_ERRORS.unexpected).toBe('Internal server error.')
})
