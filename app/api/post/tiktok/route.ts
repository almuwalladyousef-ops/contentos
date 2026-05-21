import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getCredentials } from '@/lib/drive'

export const maxDuration = 300

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const creds = await getCredentials(session.accessToken)
    if (!creds?.tt_access_token) {
      return NextResponse.json({ error: 'TikTok access token not set in Settings' }, { status: 400 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    const caption = (formData.get('caption') as string) || ''
    const privacy = (formData.get('privacy') as string) || 'SELF_ONLY'

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const { tt_access_token } = creds
    const headers = {
      Authorization: `Bearer ${tt_access_token}`,
      'Content-Type': 'application/json; charset=UTF-8',
    }

    // Step 1: Init upload
    const initRes = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        post_info: {
          title: caption.slice(0, 150) || 'New video',
          privacy_level: privacy,
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
        },
        source_info: {
          source: 'FILE_UPLOAD',
          video_size: file.size,
          chunk_size: file.size,
          total_chunk_count: 1,
        },
      }),
    })

    const initData = await initRes.json()
    if (initData.error?.code !== 'ok' && initData.error?.code !== undefined) {
      return NextResponse.json({ error: `TikTok init error: ${JSON.stringify(initData.error)}` }, { status: 400 })
    }

    const { upload_url, publish_id } = initData.data

    // Step 2: Upload file
    const buffer = await file.arrayBuffer()
    const uploadRes = await fetch(upload_url, {
      method: 'PUT',
      headers: {
        'Content-Range': `bytes 0-${file.size - 1}/${file.size}`,
        'Content-Length': String(file.size),
        'Content-Type': 'video/mp4',
      },
      body: buffer,
    })

    if (!uploadRes.ok) {
      return NextResponse.json({ error: `TikTok upload failed: ${uploadRes.status}` }, { status: 500 })
    }

    // Step 3: Poll for completion
    let attempts = 0
    while (attempts < 30) {
      await sleep(5000)
      const statusRes = await fetch('https://open.tiktokapis.com/v2/post/publish/status/fetch/', {
        method: 'POST',
        headers,
        body: JSON.stringify({ publish_id }),
      })
      const statusData = await statusRes.json()
      const status = statusData.data?.status
      if (status === 'PUBLISH_COMPLETE') {
        return NextResponse.json({ publishId: publish_id })
      }
      if (status === 'FAILED') {
        return NextResponse.json({ error: `TikTok publish failed: ${JSON.stringify(statusData)}` }, { status: 500 })
      }
      attempts++
    }

    return NextResponse.json({ error: 'TikTok publishing timed out' }, { status: 504 })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
