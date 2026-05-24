import { NextResponse } from 'next/server'

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const nextauthUrl = process.env.NEXTAUTH_URL

  const params = new URLSearchParams({
    client_id: clientId ?? 'MISSING',
    redirect_uri: `${nextauthUrl}/api/auth/callback`,
    response_type: 'code',
    scope: 'openid email profile https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/youtube.upload',
    access_type: 'offline',
    prompt: 'consent',
    state: 'personal',
  })

  return NextResponse.json({
    client_id: clientId,
    nextauth_url: nextauthUrl,
    full_url: `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
  })
}
