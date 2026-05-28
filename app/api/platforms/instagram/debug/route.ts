import { NextRequest, NextResponse } from 'next/server'
import { getPersonalAccount, getAccountsStatus } from '@/lib/accounts'
import { getCredentials } from '@/lib/drive'

const GRAPH_BASE = 'https://graph.facebook.com/v21.0'

function graphUrl(path: string, params: Record<string, string>) {
  const url = new URL(`${GRAPH_BASE}/${path}`)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  return url.toString()
}

async function fetchInsightMetric(mediaId: string, metric: string, token: string) {
  const url = new URL(`${GRAPH_BASE}/${mediaId}/insights`)
  url.searchParams.set('metric', metric)
  url.searchParams.set('period', 'lifetime')
  url.searchParams.set('access_token', token)

  const res = await fetch(url.toString())
  return {
    metric,
    status: res.status,
    body: await res.json(),
  }
}

export async function GET(req: NextRequest) {
  const [account, status] = await Promise.all([getPersonalAccount(), getAccountsStatus()])
  if (!account) return NextResponse.json({ error: 'No account connected' }, { status: 401 })

  const creds = await getCredentials(account.accessToken, status.active)
  if (!creds?.ig_access_token) return NextResponse.json({ error: 'Instagram not connected' }, { status: 400 })
  if (!creds.ig_account_id) return NextResponse.json({ error: 'Instagram business account ID not set' }, { status: 400 })

  const { ig_access_token, ig_account_id } = creds

  // No media ID — return account-level info to validate token + account type
  const mediaId = req.nextUrl.searchParams.get('id')
  if (!mediaId) {
    const [accountRes, mediaListRes] = await Promise.all([
      fetch(graphUrl(ig_account_id, {
        fields: 'id,name,username,account_type,followers_count,media_count',
        access_token: ig_access_token,
      })),
      fetch(graphUrl(`${ig_account_id}/media`, {
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
    fetch(graphUrl(mediaId, {
      fields: 'id,media_type,media_product_type,video_duration,duration,timestamp',
      access_token: ig_access_token,
    })),
    fetch(graphUrl(mediaId, { fields: 'video_duration,duration', access_token: ig_access_token })),
    Promise.all(insightMetrics.map(metric => fetchInsightMetric(mediaId, metric, ig_access_token))),
  ])

  const [media, duration] = await Promise.all([mediaRes.json(), durationRes.json()])

  return NextResponse.json({ slot: status.active, media, duration, insights: insightResults })
}
