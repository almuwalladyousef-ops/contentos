import { NextRequest, NextResponse } from 'next/server'
import { getTikTokConnection } from '@/lib/connections'

export const maxDuration = 300

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

export async function POST(req: NextRequest) {
  const connection = await getTikTokConnection()
  if (!connection) {
    return NextResponse.json({ error: 'TikTok not connected. Connect it in Settings.' }, { status: 400 })
  }
  const tt_access_token = connection.accessToken

  try {
    const { blobUrl, caption, privacy, size } = await req.json()
    if (!blobUrl) return NextResponse.json({ error: 'No blob URL provided' }, { status: 400 })

    const headers = {
      Authorization: `Bearer ${tt_access_token}`,
      'Content-Type': 'application/json; charset=UTF-8',
    }

    const initRes = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        post_info: {
          title: (caption as string)?.slice(0, 150) || 'New video',
          privacy_level: privacy || 'SELF_ONLY',
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
        },
        source_info: {
          source: 'FILE_UPLOAD',
          video_size: size,
          chunk_size: size,
          total_chunk_count: 1,
        },
      }),
    })

    const initData = await initRes.json()
    if (initData.error?.code !== 'ok' && initData.error?.code !== undefined) {
      return NextResponse.json({ error: `TikTok init error: ${JSON.stringify(initData.error)}` }, { status: 400 })
    }

    const { upload_url, publish_id } = initData.data

    const blobRes = await fetch(blobUrl)
    if (!blobRes.ok || !blobRes.body) {
      return NextResponse.json({ error: 'Failed to fetch from blob storage' }, { status: 500 })
    }

    const uploadRes = await fetch(upload_url, {
      method: 'PUT',
      headers: {
        'Content-Range': `bytes 0-${size - 1}/${size}`,
        'Content-Length': String(size),
        'Content-Type': 'video/mp4',
      },
      body: blobRes.body,
      duplex: 'half',
    } as RequestInit)

    if (!uploadRes.ok) {
      return NextResponse.json({ error: `TikTok upload failed: ${uploadRes.status}` }, { status: 500 })
    }

    let attempts = 0
    while (attempts < 30) {
      await sleep(5000)
      const statusRes = await fetch('https://open.tiktokapis.com/v2/post/publish/status/fetch/', {
        method: 'POST',
        headers,
        body: JSON.stringify({ publish_id }),
      })
      const statusData = await statusRes.json()
      const pubStatus = statusData.data?.status
      if (pubStatus === 'PUBLISH_COMPLETE') {
        return NextResponse.json({ publishId: publish_id })
      }
      if (pubStatus === 'FAILED') {
        return NextResponse.json({ error: `TikTok publish failed: ${JSON.stringify(statusData)}` }, { status: 500 })
      }
      attempts++
    }

    return NextResponse.json({ error: 'TikTok publishing timed out' }, { status: 504 })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
