import { NextRequest, NextResponse } from 'next/server'
import { toAccountSlot } from '@/lib/accounts'
import { getInstagramAppCredentials } from '@/lib/instagram'

export async function GET(req: NextRequest) {
  const slot = toAccountSlot(req.nextUrl.searchParams.get('slot'))
  const { appId, envSlot } = getInstagramAppCredentials(slot)
  if (!appId) {
    return NextResponse.json({ error: `FACEBOOK_APP_ID_${envSlot} or FACEBOOK_APP_ID must be set.` }, { status: 500 })
  }

  const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/instagram/callback`
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    response_type: 'code',
    state: slot,
    scope: [
      'pages_show_list',
      'pages_read_engagement',
      'instagram_basic',
      'instagram_manage_insights',
      'instagram_content_publish',
    ].join(','),
  })

  return NextResponse.redirect(`https://www.facebook.com/v21.0/dialog/oauth?${params}`)
}
