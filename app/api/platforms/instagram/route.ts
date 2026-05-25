import { NextResponse } from 'next/server'
import { getPersonalAccount, getAccountsStatus } from '@/lib/accounts'
import { getCredentials } from '@/lib/drive'

export async function GET() {
  const [account, status] = await Promise.all([getPersonalAccount(), getAccountsStatus()])
  if (!account) return NextResponse.json({ error: 'No account connected' }, { status: 401 })

  const creds = await getCredentials(account.accessToken, status.active)
  if (!creds?.ig_access_token || !creds?.ig_account_id) {
    return NextResponse.json({ error: 'Instagram not connected. Add credentials in Settings.' }, { status: 400 })
  }

  const { ig_access_token, ig_account_id } = creds
  const base = 'https://graph.facebook.com/v19.0'

  try {
    const mediaRes = await fetch(
      `${base}/${ig_account_id}/media?fields=id,caption,media_type,timestamp,permalink,thumbnail_url,like_count,comments_count,video_duration&limit=20&access_token=${ig_access_token}`
    )
    const mediaData = await mediaRes.json()

    if (mediaData.error) {
      return NextResponse.json({ error: mediaData.error.message }, { status: 400 })
    }

    const videoItems = (mediaData.data ?? []).filter(
      (item: { media_type: string }) => item.media_type === 'VIDEO' || item.media_type === 'REEL'
    )

    const withInsights = await Promise.all(
      videoItems.map(async (item: {
        id: string
        caption?: string
        media_type: string
        timestamp: string
        permalink?: string
        thumbnail_url?: string
        like_count?: number
        comments_count?: number
        video_duration?: number
      }) => {
        const insightMetrics: Record<string, number> = {}

        // Standard metrics — always available
        try {
          const r = await fetch(`${base}/${item.id}/insights?metric=reach,plays,saved,shares&period=lifetime&access_token=${ig_access_token}`)
          const d = await r.json()
          if (!d.error) {
            for (const m of d.data ?? []) {
              const val = m.values?.[0]?.value ?? m.value
              if (val !== undefined) insightMetrics[m.name] = val
            }
          }
        } catch { /* non-fatal */ }

        // Reels-only watch-time metrics — separate call so a failure doesn't kill standard metrics
        if (item.media_type === 'REEL') {
          try {
            const r = await fetch(`${base}/${item.id}/insights?metric=ig_reels_avg_watch_time,ig_reels_video_view_total_time&period=lifetime&access_token=${ig_access_token}`)
            const d = await r.json()
            if (!d.error) {
              for (const m of d.data ?? []) {
                const val = m.values?.[0]?.value ?? m.value
                if (val !== undefined) insightMetrics[m.name] = val
              }
            }
          } catch { /* non-fatal */ }
        }

        return {
          id: item.id,
          caption: item.caption ?? '',
          timestamp: item.timestamp,
          permalink: item.permalink,
          thumbnail: item.thumbnail_url,
          metrics: {
            platform: 'instagram' as const,
            mediaType: item.media_type,
            plays: insightMetrics['plays'],
            reach: insightMetrics['reach'],
            saves: insightMetrics['saved'],
            shares: insightMetrics['shares'],
            avgWatchTimeMs: insightMetrics['ig_reels_avg_watch_time']
              ?? (insightMetrics['ig_reels_video_view_total_time'] && insightMetrics['plays']
                ? insightMetrics['ig_reels_video_view_total_time'] / insightMetrics['plays']
                : undefined),
            likes: item.like_count,
            comments: item.comments_count,
            videoDurationSec: item.video_duration,
          },
        }
      })
    )

    return NextResponse.json({ posts: withInsights })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
