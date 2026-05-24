import { NextRequest, NextResponse } from 'next/server'

export function GET(req: NextRequest) {
  const slot = req.nextUrl.searchParams.get('slot') ?? 'personal'

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/callback`,
    response_type: 'code',
    scope: [
      'openid',
      'email',
      'profile',
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/youtube.upload',
    ].join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state: slot,
  })

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
}
