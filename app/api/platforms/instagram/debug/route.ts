import { NextRequest, NextResponse } from 'next/server'
import { getPersonalAccount, getAccountsStatus } from '@/lib/accounts'
import { ensureFolderStructure, getCredentials, saveCredentials } from '@/lib/drive'
import { instagramGraphErrorMessage, instagramGraphUrl, resolveInstagramCredentials } from '@/lib/instagram'

async function fetchInsightMetric(mediaId: string, metric: string, token: string) {
  const res = await fetch(instagramGraphUrl(`${mediaId}/insights`, {
    metric,
    period: 'lifetime',
    access_token: token,
  }))
  return {
    metric,
    status: res.status,
    body: await res.json(),
  }
}

export async function GET(req: NextRequest) {
  const [account, status] = await Promise.all([getPersonalAccount(), getAccountsStatus()])
  if (!account) return NextResponse.json({ error: 'No account connected' }, { status: 401 })

  let creds = await getCredentials(account.accessToken, status.active)
  if (!creds?.ig_access_token) return NextResponse.json({ error: 'Instagram not connected' }, { status: 400 })
  if (!creds.ig_account_id) return NextResponse.json({ error: 'Instagram business account ID not set' }, { status: 400 })
  const resolved = await resolveInstagramCredentials(creds)
  if (resolved.mediaError) {
    return NextResponse.json({
      error: instagramGraphErrorMessage('Instagram account ID is not a usable Business/Creator account ID. Reconnect Instagram in Settings so ContentOS can fetch the correct account ID.', resolved.mediaError),
    }, { status: 400 })
  }
  creds = resolved.creds
  if (resolved.changed) {
    const { rootId } = await ensureFolderStructure(account.accessToken)
    await saveCredentials(account.accessToken, rootId, creds, status.active)
  }
  if (!creds.ig_access_token || !creds.ig_account_id) {
    return NextResponse.json({ error: 'Instagram credentials not set in Settings' }, { status: 400 })
  }

  const { ig_access_token, ig_account_id } = creds

  // No media ID — return account-level info to validate token + account type
  const mediaId = req.nextUrl.searchParams.get('id')
  if (!mediaId) {
    const [accountRes, mediaListRes] = await Promise.all([
      fetch(instagramGraphUrl(ig_account_id, {
        fields: 'id,name,username,account_type,followers_count,media_count',
        access_token: ig_access_token,
      })),
      fetch(instagramGraphUrl(`${ig_account_id}/media`, {
        fields: 'id,media_type,media_product_type,timestamp',
        limit: '3',
        access_token: ig_access_token,
      })),
    ])
    const [accountInfo, mediaList] = await Promise.all([accountRes.json(), mediaListRes.json()])
    return NextResponse.json({ slot: status.active, ig_account_id, accountInfo, mediaList })
  }

  // Media ID provided — full diagnostic for that post
  const insightMetrics = [
    'reach',
    'saved',
    'shares',
    'views',
    'plays',
    'video_views',
    'ig_reels_avg_watch_time',
    'ig_reels_video_view_total_time',
  ]
  const [mediaRes, durationRes, insightResults] = await Promise.all([
    fetch(instagramGraphUrl(mediaId, {
      fields: 'id,media_type,media_product_type,video_duration,duration,timestamp',
      access_token: ig_access_token,
    })),
    fetch(instagramGraphUrl(mediaId, { fields: 'video_duration,duration', access_token: ig_access_token })),
    Promise.all(insightMetrics.map(metric => fetchInsightMetric(mediaId, metric, ig_access_token))),
  ])

  const [media, duration] = await Promise.all([mediaRes.json(), durationRes.json()])

  return NextResponse.json({ slot: status.active, ig_account_id, media, duration, insights: insightResults })
}
