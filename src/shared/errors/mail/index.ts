/** What the mail relay route answers when it cannot send. */
const MAIL_ERRORS = {
  notConfigured: 'Email sending is not configured: RESEND_API_KEY is missing.',
  missingFields: 'Missing required fields: to, subject, html.',
  unexpected: 'Internal server error.',
} as const

export default MAIL_ERRORS

// MAIL_ERRORS holds the mail relay's answers so the campaign modal reads one fixed wording.
