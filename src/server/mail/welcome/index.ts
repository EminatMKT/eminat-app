import { Resend } from 'resend'
import { serverEnv, clientEnv } from '@/server/db'
import { ADMIN_ERRORS } from '@/shared/errors'
import { MAIL_FROM, MARKETING_COORDINATOR_EMAIL } from '@/shared/constants/contacts'
import WELCOME_COPY from './copy'
import buildWelcomeEmail from './html'
import type { WelcomeArgs } from './types'

const PRODUCTION = 'production'

/** Sends the new person their temporary credentials; answers a warning for the admin, or `null`. */
export default async function sendWelcomeEmail(args: WelcomeArgs): Promise<string | null> {
  try {
    const { RESEND_API_KEY } = serverEnv
    if (!RESEND_API_KEY) return ADMIN_ERRORS.emailMissingKey
    const env = clientEnv.NEXT_PUBLIC_APP_ENV
    // The recipient is a real corporate inbox and the password travels in the body.
    if (env !== PRODUCTION) return ADMIN_ERRORS.emailNotProduction(env)
    const message = {
      from: MAIL_FROM,
      to: args.email,
      cc: MARKETING_COORDINATOR_EMAIL,
      subject: WELCOME_COPY.subject,
      html: buildWelcomeEmail(args),
    }
    const { error } = await new Resend(RESEND_API_KEY).emails.send(message)
    return error ? ADMIN_ERRORS.emailFailed(error.message) : null
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : ''
    return ADMIN_ERRORS.emailFailed(detail || ADMIN_ERRORS.emailUnknownError)
  }
}

// Best effort by design: the user already exists when this runs, so a failure is a warning the
// admin sees (CredentialsPanel appends `admin.shareManually`), never a failed request.
