import { NextRequest, NextResponse } from 'next/server'
import { clearGoogleAccount, clearInstagramConnection, clearTikTokConnection } from '@/lib/connections'

export async function POST(req: NextRequest) {
  const { platform } = await req.json()

  switch (platform) {
    case 'youtube':
    case 'google':
      await clearGoogleAccount()
      break
    case 'instagram':
      await clearInstagramConnection()
      break
    case 'tiktok':
      await clearTikTokConnection()
      break
    default:
      return NextResponse.json({ error: 'Invalid platform' }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
