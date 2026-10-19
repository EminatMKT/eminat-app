import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  // Return a real 404 before streaming any Sales route while QA is off.
  // The page and adapter separately verify the exact user/Auth ID allowlist.
  if ((pathname === '/sales' || pathname.startsWith('/sales/')) &&
      process.env.ANNIE_SALES_QA_ENABLED !== 'true') return new NextResponse(null, { status: 404 })
  // Native Sales is an isolated review surface until migration and parity gates pass.
  if ((pathname === '/sales-native' || pathname.startsWith('/sales-native/')) &&
      process.env.LILLY_NATIVE_SALES_ENABLED !== 'true') return new NextResponse(null, { status: 404 })
  const hasSession = request.cookies.getAll().some(c => c.name.startsWith('sb-') && c.name.includes('-auth-token'))
  if (!hasSession && pathname !== '/login') return NextResponse.redirect(new URL('/login', request.url))
  if (hasSession && pathname === '/login') return NextResponse.redirect(new URL('/', request.url))
  return NextResponse.next()
}
export const config = { matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'] }
