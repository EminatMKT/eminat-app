// Production origins are explicit. Local Supabase is only allowed outside Production.
const production = process.env.NODE_ENV === 'production'
const supabase = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ruedelunbtaomhrzgelc.supabase.co')
const database = [supabase.origin, `${supabase.protocol === 'https:' ? 'wss:' : 'ws:'}//${supabase.host}`]
const local = production ? [] : ['http://127.0.0.1:54321', 'ws://127.0.0.1:54321', 'http://127.0.0.1:3196', 'ws://127.0.0.1:3196']
const csp = [
  "default-src 'self'",
  // Next hydration emits inline scripts; nonce conversion is a separate rendering change.
  `script-src 'self' 'unsafe-inline'${production ? '' : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'", "img-src 'self' data: blob: https://ruedelunbtaomhrzgelc.supabase.co",
  "font-src 'self'", `connect-src 'self' ${[...database, ...local, 'https://ipapi.co', 'https://clinicaltrials.gov'].join(' ')}`,
  "frame-src 'self' blob: https://meet.stratixsolutions.us", "frame-ancestors 'none'",
  "form-action 'self'", "base-uri 'self'", "object-src 'none'",
  ...(production ? ['upgrade-insecure-requests'] : []),
].join('; ')
module.exports = {
  csp,
  securityHeaders: [
    { key: 'Strict-Transport-Security', value: 'max-age=63072000' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Content-Security-Policy', value: csp },
  ],
}
