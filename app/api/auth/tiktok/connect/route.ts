import { NextRequest, NextResponse } from 'next/server'
import { getBaseUrl } from '@/lib/oauth'

export async function GET(req: NextRequest) {
  if (!process.env.TIKTOK_CLIENT_KEY) {
    return NextResponse.redirect(
      new URL(`/settings?tt_error=${encodeURIComponent('TikTok app not configured. Set TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET.')}`, req.url)
    )
  }

  const redirectUri = `${getBaseUrl(req)}/api/auth/tiktok/callback`
  const params = new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY,
    scope: 'video.publish,video.upload,video.list,user.info.basic',
    response_type: 'code',
    redirect_uri: redirectUri,
    // Always show the account chooser so reconnecting can switch accounts.
    force_login: 'true',
  })

  return NextResponse.redirect(`https://www.tiktok.com/v2/auth/authorize/?${params}`)
}
