import { NextRequest, NextResponse } from 'next/server'
import { getActiveAccount } from '@/lib/accounts'

export const maxDuration = 300

export async function POST(req: NextRequest) {
  const account = await getActiveAccount()
  if (!account) return NextResponse.json({ error: 'No account connected' }, { status: 401 })

  try {
    const { blobUrl, title, description, privacy, size, type } = await req.json()
    if (!blobUrl) return NextResponse.json({ error: 'No blob URL provided' }, { status: 400 })

    const initRes = await fetch(
      'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${account.accessToken}`,
          'Content-Type': 'application/json',
          'X-Upload-Content-Type': type || 'video/mp4',
          'X-Upload-Content-Length': String(size),
        },
        body: JSON.stringify({
          snippet: { title: title || 'New video', description: description || '' },
          status: { privacyStatus: privacy || 'unlisted' },
        }),
      }
    )

    if (!initRes.ok) {
      const err = await initRes.text()
      return NextResponse.json({ error: `YouTube init failed: ${err}` }, { status: initRes.status })
    }

    const sessionUri = initRes.headers.get('Location')
    if (!sessionUri) return NextResponse.json({ error: 'No upload URI returned' }, { status: 500 })

    const blobRes = await fetch(blobUrl)
    if (!blobRes.ok || !blobRes.body) {
      return NextResponse.json({ error: 'Failed to fetch from blob storage' }, { status: 500 })
    }

    const uploadRes = await fetch(sessionUri, {
      method: 'PUT',
      headers: {
        'Content-Range': `bytes 0-${size - 1}/${size}`,
        'Content-Type': type || 'video/mp4',
      },
      body: blobRes.body,
      duplex: 'half',
    } as RequestInit)

    if (!uploadRes.ok && uploadRes.status !== 200 && uploadRes.status !== 201) {
      const err = await uploadRes.text()
      return NextResponse.json({ error: `YouTube upload failed: ${err}` }, { status: uploadRes.status })
    }

    const data = await uploadRes.json()
    if (!data.id) return NextResponse.json({ error: 'No video ID returned' }, { status: 500 })

    return NextResponse.json({ videoId: data.id, videoUrl: `https://www.youtube.com/watch?v=${data.id}` })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
