import { NextRequest, NextResponse } from 'next/server'
import { getActiveAccount } from '@/lib/accounts'

export const maxDuration = 300

export async function POST(req: NextRequest) {
  const account = await getActiveAccount()
  if (!account) return NextResponse.json({ error: 'No account connected' }, { status: 401 })

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const title = (formData.get('title') as string) || file.name.replace(/\.[^.]+$/, '')
    const description = (formData.get('description') as string) || ''
    const privacy = (formData.get('privacy') as string) || 'unlisted'

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    // Step 1: Initiate resumable upload session
    const initRes = await fetch(
      'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${account.accessToken}`,
          'Content-Type': 'application/json',
          'X-Upload-Content-Type': file.type || 'video/mp4',
          'X-Upload-Content-Length': String(file.size),
        },
        body: JSON.stringify({
          snippet: { title, description },
          status: { privacyStatus: privacy },
        }),
      }
    )

    if (!initRes.ok) {
      const err = await initRes.text()
      return NextResponse.json({ error: `YouTube init failed: ${err}` }, { status: initRes.status })
    }

    const sessionUri = initRes.headers.get('Location')
    if (!sessionUri) return NextResponse.json({ error: 'No upload session URI returned' }, { status: 500 })

    // Step 2: Upload file to resumable session URI
    const buffer = await file.arrayBuffer()
    const uploadRes = await fetch(sessionUri, {
      method: 'PUT',
      headers: {
        'Content-Range': `bytes 0-${file.size - 1}/${file.size}`,
        'Content-Type': file.type || 'video/mp4',
      },
      body: buffer,
    })

    if (!uploadRes.ok && uploadRes.status !== 200 && uploadRes.status !== 201) {
      const err = await uploadRes.text()
      return NextResponse.json({ error: `YouTube upload failed: ${err}` }, { status: uploadRes.status })
    }

    const data = await uploadRes.json()
    const videoId = data.id
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`

    return NextResponse.json({ videoId, videoUrl })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
