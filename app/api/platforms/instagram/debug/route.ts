import { NextRequest, NextResponse } from 'next/server'
import { getPersonalAccount, getAccountsStatus } from '@/lib/accounts'
import { getCredentials } from '@/lib/drive'

export async function GET(req: NextRequest) {
  const mediaId = req.nextUrl.searchParams.get('id')
  if (!mediaId) return NextResponse.json({ error: 'Missing ?id=<media_id>' }, { status: 400 })

  const [account, status] = await Promise.all([getPersonalAccount(), getAccountsStatus()])
  if (!account) return NextResponse.json({ error: 'No account connected' }, { status: 401 })

  const creds = await getCredentials(account.accessToken, status.active)
  if (!creds?.ig_access_token) return NextResponse.json({ error: 'Instagram not connected' }, { status: 400 })

  const { ig_access_token } = creds
  const base = 'https://graph.facebook.com/v19.0'

  const [mediaRes, standardRes, reelsRes] = await Promise.all([
    fetch(`${base}/${mediaId}?fields=id,media_type,video_duration,timestamp&access_token=${ig_access_token}`),
    fetch(`${base}/${mediaId}/insights?metric=reach,plays,saved,shares&period=lifetime&access_token=${ig_access_token}`),
    fetch(`${base}/${mediaId}/insights?metric=ig_reels_avg_watch_time,ig_reels_video_view_total_time&period=lifetime&access_token=${ig_access_token}`),
  ])

  const [media, standard, reels] = await Promise.all([mediaRes.json(), standardRes.json(), reelsRes.json()])

  return NextResponse.json({ media, standard, reels })
}
