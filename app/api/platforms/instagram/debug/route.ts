import { NextRequest, NextResponse } from 'next/server'
import { getPersonalAccount, getAccountsStatus } from '@/lib/accounts'
import { getCredentials } from '@/lib/drive'

export async function GET(req: NextRequest) {
  const [account, status] = await Promise.all([getPersonalAccount(), getAccountsStatus()])
  if (!account) return NextResponse.json({ error: 'No account connected' }, { status: 401 })

  const creds = await getCredentials(account.accessToken, status.active)
  if (!creds?.ig_access_token) return NextResponse.json({ error: 'Instagram not connected' }, { status: 400 })

  const { ig_access_token, ig_account_id } = creds
  const base = 'https://graph.facebook.com/v21.0'

  // No media ID — return account-level info to validate token + account type
  const mediaId = req.nextUrl.searchParams.get('id')
  if (!mediaId) {
    const [accountRes, mediaListRes] = await Promise.all([
      fetch(`${base}/${ig_account_id}?fields=id,name,username,account_type,followers_count,media_count&access_token=${ig_access_token}`),
      fetch(`${base}/${ig_account_id}/media?fields=id,media_type,timestamp&limit=3&access_token=${ig_access_token}`),
    ])
    const [accountInfo, mediaList] = await Promise.all([accountRes.json(), mediaListRes.json()])
    return NextResponse.json({ slot: status.active, ig_account_id, accountInfo, mediaList })
  }

  // Media ID provided — full diagnostic for that post
  const [mediaRes, standardRes, playsRes, reelsRes, durationRes] = await Promise.all([
    fetch(`${base}/${mediaId}?fields=id,media_type,media_product_type,video_duration,duration,timestamp&access_token=${ig_access_token}`),
    fetch(`${base}/${mediaId}/insights?metric=reach,saved,shares&period=lifetime&access_token=${ig_access_token}`),
    fetch(`${base}/${mediaId}/insights?metric=plays,video_views&period=lifetime&access_token=${ig_access_token}`),
    fetch(`${base}/${mediaId}/insights?metric=ig_reels_avg_watch_time,ig_reels_video_view_total_time&period=lifetime&access_token=${ig_access_token}`),
    fetch(`${base}/${mediaId}?fields=video_duration,duration&access_token=${ig_access_token}`),
  ])

  const [media, standard, plays, reels, duration] = await Promise.all([
    mediaRes.json(), standardRes.json(), playsRes.json(), reelsRes.json(), durationRes.json(),
  ])

  return NextResponse.json({ slot: status.active, media, standard, plays, reels, duration })
}
