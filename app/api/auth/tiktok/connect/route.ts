import { NextResponse } from 'next/server'

export async function GET() {
  const clientKey = process.env.TIKTOK_CLIENT_KEY!
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/tiktok/callback`

  const params = new URLSearchParams({
    client_key: clientKey,
    scope: 'video.publish,video.upload,user.info.basic',
    response_type: 'code',
    redirect_uri: redirectUri,
    state: 'tiktok_connect',
  })

  return NextResponse.redirect(`https://www.tiktok.com/v2/auth/authorize/?${params}`)
}
