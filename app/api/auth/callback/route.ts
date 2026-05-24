import { NextRequest, NextResponse } from 'next/server'
import { AccountSlot, encryptAccount, COOKIE_OPTS } from '@/lib/accounts'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const slot = (req.nextUrl.searchParams.get('state') ?? 'personal') as AccountSlot

  if (!code) return NextResponse.redirect(new URL('/settings?error=no_code', req.url))

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/callback`,
      grant_type: 'authorization_code',
    }),
  })
  const tokens = await tokenRes.json()
  if (!tokens.access_token) {
    return NextResponse.redirect(new URL(`/settings?error=token_exchange`, req.url))
  }

  const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })
  const user = await userRes.json()

  const encrypted = encryptAccount({
    email: user.email,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: Math.floor(Date.now() / 1000) + (tokens.expires_in ?? 3600),
  })

  const response = NextResponse.redirect(new URL('/settings', req.url))
  response.cookies.set(`cms_${slot}`, encrypted, COOKIE_OPTS)
  response.cookies.set('cms_active', slot, COOKIE_OPTS)
  return response
}
