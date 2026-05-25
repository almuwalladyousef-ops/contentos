import { NextResponse } from 'next/server'
import { getPersonalAccount, getAccountsStatus } from '@/lib/accounts'
import { getCredentials, saveCredentials, ensureFolderStructure } from '@/lib/drive'

export async function POST() {
  const appId = process.env.FACEBOOK_APP_ID
  const appSecret = process.env.FACEBOOK_APP_SECRET
  if (!appId || !appSecret) {
    return NextResponse.json({ error: 'FACEBOOK_APP_ID and FACEBOOK_APP_SECRET must be set as environment variables.' }, { status: 500 })
  }

  const [account, status] = await Promise.all([getPersonalAccount(), getAccountsStatus()])
  if (!account) return NextResponse.json({ error: 'No account connected' }, { status: 401 })

  const creds = await getCredentials(account.accessToken, status.active)
  if (!creds?.ig_access_token) {
    return NextResponse.json({ error: 'No Instagram token to refresh. Paste one in Settings first.' }, { status: 400 })
  }

  const res = await fetch(
    `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${encodeURIComponent(creds.ig_access_token)}`
  )
  const data = await res.json()

  if (data.error) {
    return NextResponse.json({ error: data.error.message }, { status: 400 })
  }

  const newToken: string = data.access_token
  const expiresInDays = Math.round((data.expires_in ?? 5183944) / 86400)

  const { rootId } = await ensureFolderStructure(account.accessToken)
  await saveCredentials(account.accessToken, rootId, { ...creds, ig_access_token: newToken }, status.active)

  return NextResponse.json({ ok: true, expires_in_days: expiresInDays })
}
