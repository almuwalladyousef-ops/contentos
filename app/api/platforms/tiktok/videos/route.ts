import { NextResponse } from 'next/server'
import { getPersonalAccount, getAccountsStatus } from '@/lib/accounts'
import { getCredentials, ensureFolderStructure, getTikTokToken } from '@/lib/drive'

export async function GET() {
  const [account, status] = await Promise.all([getPersonalAccount(), getAccountsStatus()])
  if (!account) return NextResponse.json({ error: 'No account connected' }, { status: 401 })

  const creds = await getCredentials(account.accessToken, status.active)
  if (!creds?.tt_access_token) {
    return NextResponse.json({ error: 'TikTok not connected. Add credentials in Settings.' }, { status: 400 })
  }

  const { rootId } = await ensureFolderStructure(account.accessToken)
  const token = await getTikTokToken(account.accessToken, rootId, status.active)
  if (!token) {
    return NextResponse.json({ error: 'TikTok token unavailable. Reconnect in Settings.' }, { status: 400 })
  }

  try {
    const res = await fetch('https://open.tiktokapis.com/v2/video/list/?fields=id,title,video_description,create_time,cover_image_url,share_url,duration,like_count,comment_count,share_count,view_count', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ max_count: 20 }),
    })

    const data = await res.json()

    if (data.error?.code && data.error.code !== 'ok') {
      return NextResponse.json({ error: data.error.message ?? 'TikTok API error' }, { status: 400 })
    }

    const videos = data.data?.videos ?? []

    const posts = videos.map((v: {
      id: string
      title?: string
      video_description?: string
      create_time?: number
      cover_image_url?: string
      share_url?: string
      duration?: number
      like_count?: number
      comment_count?: number
      share_count?: number
      view_count?: number
    }) => ({
      id: v.id,
      title: v.title ?? v.video_description?.slice(0, 80) ?? '',
      caption: v.video_description ?? v.title ?? '',
      timestamp: v.create_time ? new Date(v.create_time * 1000).toISOString() : new Date().toISOString(),
      thumbnail: v.cover_image_url,
      permalink: v.share_url,
      metrics: {
        platform: 'tiktok' as const,
        views: v.view_count,
        likes: v.like_count,
        comments: v.comment_count,
        shares: v.share_count,
        videoDurationSec: v.duration,
      },
    }))

    return NextResponse.json({ posts })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
