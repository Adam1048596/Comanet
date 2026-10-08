import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE, isAuthDisabled, verifySessionToken } from '@/utils/auth'

export async function GET(request: NextRequest) {
  if (isAuthDisabled()) return NextResponse.json({ email: '', authDisabled: true })

  const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ email: session.email, authDisabled: false })
}
