import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const slot = req.nextUrl.searchParams.get('slot') ?? 'personal'
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/tiktok/callback`

  const params = new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY!,
    scope: 'video.publish,video.upload,video.list,user.info.basic',
    response_type: 'code',
    redirect_uri: redirectUri,
    state: slot,
    force_login: 'true',
  })

  return NextResponse.redirect(`https://www.tiktok.com/v2/auth/authorize/?${params}`)
}
