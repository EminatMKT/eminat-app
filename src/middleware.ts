import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { nativeSalesPrimary } from '@/server/sales-native/release-gate'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  // Preserve a real, pre-streaming 404 when the active Sales runtime is disabled.
  if ((pathname === '/sales' || pathname.startsWith('/sales/')) &&
      !nativeSalesPrimary()) return new NextResponse(null, { status: 404 })
  const hasSession = request.cookies.getAll().some(c => c.name.startsWith('sb-') && c.name.includes('-auth-token'))
  if (!hasSession && pathname !== '/login') {
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.headers.set('Cache-Control', 'private, no-store')
    return response
  }
  if (hasSession && pathname === '/login') {
    const response = NextResponse.redirect(new URL('/', request.url))
    response.headers.set('Cache-Control', 'private, no-store')
    return response
  }
  const response = NextResponse.next()
  // Authenticated HTML must not enter shared caches; public assets keep their caching.
  if (hasSession) response.headers.set('Cache-Control', 'private, no-store')
  return response
}
export const config = { matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'] }
