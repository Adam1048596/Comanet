import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE, isAuthDisabled, verifySessionToken } from './utils/auth'

export default async function proxy(request: NextRequest) {
  if (isAuthDisabled()) return NextResponse.next()

  const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value)
  if (session) return NextResponse.next()

  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = request.nextUrl.clone()
  url.pathname = '/login'
  url.search = ''
  return NextResponse.redirect(url)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|login|api/auth/login|api/auth/logout).*)',
  ],
}
