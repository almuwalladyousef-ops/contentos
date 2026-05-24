import { NextRequest, NextResponse } from 'next/server'
import { getPersonalAccount } from '@/lib/accounts'
import { getCredentials, saveCredentials, ensureFolderStructure } from '@/lib/drive'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
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
  const accessToken = tokenData.data?.access_token

  if (!accessToken) {
    const code = tokenData.error?.code ?? 'unknown'
    return NextResponse.redirect(`${base}/settings?tt_error=${code}`)
  }

  const { rootId } = await ensureFolderStructure(account.accessToken)
  const existing = await getCredentials(account.accessToken) ?? {}
  await saveCredentials(account.accessToken, rootId, { ...existing, tt_access_token: accessToken })

  return NextResponse.redirect(`${base}/settings?tt_connected=1`)
}
