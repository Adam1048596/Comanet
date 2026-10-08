import { NextRequest, NextResponse } from 'next/server'
import { createHash, timingSafeEqual } from 'crypto'
import { SESSION_COOKIE, SESSION_MAX_AGE, createSessionToken } from '@/utils/auth'

function safeEqual(a: string, b: string) {
  const ha = createHash('sha256').update(a).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb)
}

export async function POST(request: NextRequest) {
  const expectedEmail = process.env.AUTH_EMAIL
  const expectedPassword = process.env.AUTH_PASSWORD
  if (!expectedEmail || !expectedPassword || !process.env.AUTH_SECRET) {
    return NextResponse.json(
      { error: 'Sign in is not configured. Set AUTH_EMAIL, AUTH_PASSWORD and AUTH_SECRET.' },
      { status: 500 }
    )
  }

  const body = await request.json().catch(() => ({}))
  const email = String(body.email ?? '').trim().toLowerCase()
  const password = String(body.password ?? '')

  const emailOk = safeEqual(email, expectedEmail.trim().toLowerCase())
  const passwordOk = safeEqual(password, expectedPassword)
  if (!emailOk || !passwordOk) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
  }

  const response = NextResponse.json({ email })
  response.cookies.set(SESSION_COOKIE, await createSessionToken(email), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  })
  return response
}
