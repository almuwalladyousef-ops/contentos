import { NextRequest, NextResponse } from 'next/server'
import { getPersonalAccount, getAccountsStatus, toAccountSlot } from '@/lib/accounts'
import { getCredentials, saveCredentials, ensureFolderStructure } from '@/lib/drive'
import { instagramGraphUrl } from '@/lib/instagram'

export async function POST(req: NextRequest) {
  const [account, status] = await Promise.all([getPersonalAccount(), getAccountsStatus()])
  if (!account) return NextResponse.json({ error: 'No account connected' }, { status: 401 })

  const requestedSlot = toAccountSlot(req.nextUrl.searchParams.get('slot'), status.active)
  const envSlot = requestedSlot.toUpperCase() // 'PERSONAL' or 'BUSINESS'
  const appId = process.env[`FACEBOOK_APP_ID_${envSlot}`] ?? process.env.FACEBOOK_APP_ID
  const appSecret = process.env[`FACEBOOK_APP_SECRET_${envSlot}`] ?? process.env.FACEBOOK_APP_SECRET
  if (!appId || !appSecret) {
    return NextResponse.json({ error: `FACEBOOK_APP_ID_${envSlot} and FACEBOOK_APP_SECRET_${envSlot} must be set as environment variables.` }, { status: 500 })
  }

  const creds = await getCredentials(account.accessToken, requestedSlot)
  if (!creds?.ig_access_token) {
    return NextResponse.json({ error: 'No Instagram token to refresh. Paste one in Settings first.' }, { status: 400 })
  }

  const res = await fetch(instagramGraphUrl('oauth/access_token', {
    grant_type: 'fb_exchange_token',
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: creds.ig_access_token,
  }))
  const data = await res.json()

  if (data.error) {
    return NextResponse.json({ error: data.error.message }, { status: 400 })
  }

  const newToken: string = data.access_token
  const expiresInDays = Math.round((data.expires_in ?? 5183944) / 86400)

  const { rootId } = await ensureFolderStructure(account.accessToken)
  await saveCredentials(account.accessToken, rootId, { ...creds, ig_access_token: newToken }, requestedSlot)

  return NextResponse.json({ ok: true, slot: requestedSlot, expires_in_days: expiresInDays })
}
