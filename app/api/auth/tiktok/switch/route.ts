import { NextRequest, NextResponse } from 'next/server'
import { getPersonalAccount, toAccountSlot } from '@/lib/accounts'
import { getCredentials } from '@/lib/drive'

export async function GET(req: NextRequest) {
  const slot = toAccountSlot(req.nextUrl.searchParams.get('slot'))
  const base = process.env.NEXTAUTH_URL!

  // Revoke the existing token so TikTok shows a fresh login screen
  try {
    const account = await getPersonalAccount()
    if (account) {
      const creds = await getCredentials(account.accessToken, slot)
      if (creds?.tt_access_token) {
        await fetch('https://open.tiktokapis.com/v2/oauth/revoke/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_key: process.env.TIKTOK_CLIENT_KEY!,
            client_secret: process.env.TIKTOK_CLIENT_SECRET!,
            token: creds.tt_access_token,
          }),
        })
      }
    }
  } catch { /* non-fatal — proceed to auth anyway */ }

  const redirectUri = `${base}/api/auth/tiktok/callback`
  const params = new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY!,
    scope: 'video.publish,video.upload,user.info.basic',
    response_type: 'code',
    redirect_uri: redirectUri,
    state: slot,
  })

  return NextResponse.redirect(`https://www.tiktok.com/v2/auth/authorize/?${params}`)
}
