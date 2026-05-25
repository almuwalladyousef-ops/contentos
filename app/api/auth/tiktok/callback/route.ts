import { NextRequest, NextResponse } from 'next/server'
import { getPersonalAccount, AccountSlot } from '@/lib/accounts'
import { getCredentials, saveCredentials, ensureFolderStructure } from '@/lib/drive'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const slot = (searchParams.get('state') ?? 'personal') as AccountSlot
  const base = process.env.NEXTAUTH_URL!

  if (error || !code) {
    return NextResponse.redirect(`${base}/settings?tt_error=${error ?? 'no_code'}`)
  }

  const account = await getPersonalAccount()
  if (!account) {
    return NextResponse.redirect(`${base}/settings?tt_error=no_account`)
  }

  const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      code,
      grant_type: 'authorization_code',
      redirect_uri: `${base}/api/auth/tiktok/callback`,
    }),
  })

  const tokenData = await tokenRes.json()
  const accessToken = tokenData.access_token ?? tokenData.data?.access_token
  const refreshToken = tokenData.refresh_token ?? tokenData.data?.refresh_token
  const expiresIn = tokenData.expires_in ?? tokenData.data?.expires_in ?? 86400

  if (!accessToken) {
    const errMsg = encodeURIComponent(JSON.stringify(tokenData))
    return NextResponse.redirect(`${base}/settings?tt_error=${errMsg}`)
  }

  let tt_display_name = ''
  try {
    const userRes = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=display_name', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const userData = await userRes.json()
    tt_display_name = userData.data?.user?.display_name ?? ''
  } catch { /* non-fatal */ }

  const { rootId } = await ensureFolderStructure(account.accessToken)
  const existing = await getCredentials(account.accessToken, slot) ?? {}
  await saveCredentials(account.accessToken, rootId, {
    ...existing,
    tt_access_token: accessToken,
    tt_refresh_token: refreshToken ?? existing.tt_refresh_token,
    tt_expires_at: Date.now() + expiresIn * 1000,
    tt_display_name,
  }, slot)

  return NextResponse.redirect(`${base}/settings?tt_connected=1&slot=${slot}`)
}
