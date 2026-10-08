// Simple cookie-based sign in (no external auth provider).
// Credentials come from env vars: AUTH_EMAIL, AUTH_PASSWORD, AUTH_SECRET.
// Set AUTH_DISABLED=true to turn sign in off entirely.

export const SESSION_COOKIE = 'comanet_session'
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

const encoder = new TextEncoder()

export function isAuthDisabled() {
  return process.env.AUTH_DISABLED === 'true'
}

function getSecret() {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error('AUTH_SECRET is not set')
  return secret
}

function toBase64Url(bytes: Uint8Array) {
  let bin = ''
  bytes.forEach(b => { bin += String.fromCharCode(b) })
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(str: string) {
  const bin = atob(str.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(bin, c => c.charCodeAt(0))
}

async function getKey() {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(getSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

export async function createSessionToken(email: string) {
  const payload = toBase64Url(
    encoder.encode(JSON.stringify({ email, exp: Date.now() + SESSION_MAX_AGE * 1000 }))
  )
  const sig = await crypto.subtle.sign('HMAC', await getKey(), encoder.encode(payload))
  return `${payload}.${toBase64Url(new Uint8Array(sig))}`
}

export async function verifySessionToken(token: string | undefined): Promise<{ email: string } | null> {
  if (!token) return null
  const [payload, sig] = token.split('.')
  if (!payload || !sig) return null

  try {
    const valid = await crypto.subtle.verify(
      'HMAC',
      await getKey(),
      fromBase64Url(sig),
      encoder.encode(payload)
    )
    if (!valid) return null

    const data = JSON.parse(new TextDecoder().decode(fromBase64Url(payload)))
    if (typeof data.email !== 'string' || typeof data.exp !== 'number' || data.exp < Date.now()) return null
    return { email: data.email }
  } catch {
    return null
  }
}
