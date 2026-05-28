import { NextRequest, NextResponse } from 'next/server'
import { getPersonalAccount, toAccountSlot } from '@/lib/accounts'
import { getCredentials, saveCredentials, ensureFolderStructure } from '@/lib/drive'
import {
  exchangeFacebookCodeForToken,
  exchangeForLongLivedToken,
  findInstagramAccountConnection,
  getInstagramAppCredentials,
} from '@/lib/instagram'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const error = req.nextUrl.searchParams.get('error') ?? req.nextUrl.searchParams.get('error_message')
  const slot = toAccountSlot(req.nextUrl.searchParams.get('state'))
  const base = process.env.NEXTAUTH_URL!

  if (error || !code) {
    return NextResponse.redirect(`${base}/settings?ig_error=${encodeURIComponent(error ?? 'no_code')}`)
  }

  const account = await getPersonalAccount()
  if (!account) {
    return NextResponse.redirect(`${base}/settings?ig_error=no_google_account`)
  }

  const { appId, appSecret, envSlot } = getInstagramAppCredentials(slot)
  if (!appId || !appSecret) {
    return NextResponse.redirect(`${base}/settings?ig_error=${encodeURIComponent(`FACEBOOK_APP_ID_${envSlot} and FACEBOOK_APP_SECRET_${envSlot} must be set.`)}`)
  }

  const redirectUri = `${base}/api/auth/instagram/callback`
  const shortToken = await exchangeFacebookCodeForToken({ code, redirectUri, appId, appSecret })
  if (!shortToken.access_token) {
    return NextResponse.redirect(`${base}/settings?ig_error=${encodeURIComponent(shortToken.error?.message ?? 'token_exchange_failed')}`)
  }

  const longToken = await exchangeForLongLivedToken({
    accessToken: shortToken.access_token,
    appId,
    appSecret,
  })
  const accessToken = longToken.access_token ?? shortToken.access_token

  const connection = await findInstagramAccountConnection(accessToken)
  if (!connection) {
    return NextResponse.redirect(`${base}/settings?ig_error=${encodeURIComponent('No connected Instagram Business or Creator account found. Make sure your Instagram account is connected to a Facebook Page you manage.')}`)
  }

  const { rootId } = await ensureFolderStructure(account.accessToken)
  const existing = await getCredentials(account.accessToken, slot) ?? {}
  await saveCredentials(account.accessToken, rootId, {
    ...existing,
    ig_access_token: connection.accessToken,
    ig_account_id: connection.accountId,
  }, slot)

  return NextResponse.redirect(`${base}/settings?ig_connected=1&slot=${slot}`)
}
