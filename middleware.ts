import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { moduleForPath, canAccess, normalizeRole, type Role } from '@/shared/auth/permissions'

/**
 * Edge middleware.
 *
 * Two layers of enforcement:
 *  1. Session presence — any non-/login path requires an sb-*-auth-token cookie.
 *  2. Role-based module access — paths under (app) that map to a permission-
 *     gated module check that the JWT contains a role allowed for that module.
 *
 * Role source: app_metadata.role (preferred) or user_metadata.role inside the
 * JWT claims. The claim is populated by a Supabase custom_access_token Auth
 * Hook (see notes in the deploy README). Until that hook is configured, the
 * claim won't be present — the middleware then FAILS OPEN and defers to the
 * in-page checks (AppContext + sidebar gating). Once the hook runs and users
 * re-log in (or their token refreshes), enforcement becomes server-side.
 */

function getAuthCookieValue(req: NextRequest): string | null {
  // Supabase SSR uses sb-<project-ref>-auth-token. Cookies larger than ~4KB
  // are split into .0, .1, ... — reassemble them in numeric order.
  const all = req.cookies.getAll()
  const main = all.find((c) => /^sb-.*-auth-token$/.test(c.name))
  if (main) return main.value
  const chunks = all
    .filter((c) => /^sb-.*-auth-token\.\d+$/.test(c.name))
    .sort((a, b) => {
      const ai = parseInt(a.name.split('.').pop()!, 10)
      const bi = parseInt(b.name.split('.').pop()!, 10)
      return ai - bi
    })
  if (chunks.length === 0) return null
  return chunks.map((c) => c.value).join('')
}

function extractAccessToken(raw: string | null): string | null {
  if (!raw) return null
  let val = raw
  // Newer Supabase SSR wraps the cookie value in a `base64-` prefix.
  if (val.startsWith('base64-')) {
    try {
      val = atob(val.slice(7))
    } catch {
      return null
    }
  }
  try {
    const parsed = JSON.parse(val)
    if (Array.isArray(parsed) && typeof parsed[0] === 'string') return parsed[0]
    if (parsed && typeof parsed.access_token === 'string') return parsed.access_token
  } catch {
    // Not JSON. If it looks like a JWT itself, use it.
    if (val.split('.').length === 3) return val
  }
  return null
}

function decodeJwtPayload(jwt: string | null): Record<string, any> | null {
  if (!jwt) return null
  const parts = jwt.split('.')
  if (parts.length !== 3) return null
  try {
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const pad = b64.length % 4 ? '='.repeat(4 - (b64.length % 4)) : ''
    return JSON.parse(atob(b64 + pad))
  } catch {
    return null
  }
}

function getRoleFromClaims(claims: Record<string, any> | null): Role | null {
  if (!claims) return null
  const raw = claims?.app_metadata?.role ?? claims?.user_metadata?.role ?? null
  return normalizeRole(raw)
}

export function middleware(request: NextRequest) {
  const hasSessionCookie = request.cookies
    .getAll()
    .some((c) => c.name.startsWith('sb-') && c.name.includes('-auth-token'))

  const { pathname } = request.nextUrl

  if (!hasSessionCookie && pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (hasSessionCookie && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Role-based protection for permission-gated module routes.
  if (hasSessionCookie) {
    const moduleSlug = moduleForPath(pathname)
    if (moduleSlug) {
      const raw = getAuthCookieValue(request)
      const jwt = extractAccessToken(raw)
      const claims = decodeJwtPayload(jwt)
      const role = getRoleFromClaims(claims)

      // FAIL OPEN if we couldn't determine the role from the JWT.
      // This makes the middleware safe to deploy BEFORE the Supabase Auth
      // Hook is configured — in-page checks still gate access. After the
      // hook is enabled and users re-log in, enforcement runs here.
      if (role !== null && !canAccess(role, moduleSlug)) {
        const url = request.nextUrl.clone()
        url.pathname = '/'
        return NextResponse.redirect(url)
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
