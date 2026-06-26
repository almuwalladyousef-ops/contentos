import { NextRequest, NextResponse } from 'next/server'
import { getInstagramConnection, saveInstagramConnection } from '@/lib/connections'
import { instagramGraphErrorMessage, instagramGraphUrl, resolveInstagramAccountId } from '@/lib/instagram'

export const maxDuration = 120

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

export async function POST(req: NextRequest) {
  const connection = await getInstagramConnection()
  if (!connection) {
    return NextResponse.json({ error: 'Instagram not connected. Connect it in Settings.' }, { status: 400 })
  }

  try {
    const ig_access_token = connection.accessToken
    const resolved = await resolveInstagramAccountId(ig_access_token, connection.accountId)
    if (resolved.mediaError) {
      return NextResponse.json({
        error: instagramGraphErrorMessage('Instagram account is not a usable Business/Creator account. Reconnect Instagram in Settings.', resolved.mediaError),
      }, { status: 400 })
    }
    const ig_account_id = resolved.accountId
    if (resolved.changed) {
      await saveInstagramConnection({ access_token: ig_access_token, account_id: ig_account_id, username: connection.username })
    }

    const { videoUrl, caption } = await req.json()
    if (!videoUrl) return NextResponse.json({ error: 'No video URL provided' }, { status: 400 })

    // Step 1: Create media container
    const containerParams = new URLSearchParams({
      media_type: 'REELS',
      video_url: videoUrl,
      caption: caption || '',
      access_token: ig_access_token,
    })
    const containerRes = await fetch(instagramGraphUrl(`${ig_account_id}/media`, {}), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: containerParams,
    })
    const containerData = await containerRes.json()
    if (containerData.error) {
      const e = containerData.error
      return NextResponse.json({ error: `Instagram container error: (#${e.code}/${e.error_subcode}) ${e.message} [type: ${e.type}]` }, { status: 400 })
    }
    const creationId = containerData.id

    // Step 2: Poll until processing complete
    let attempts = 0
    while (attempts < 40) {
      await sleep(3000)
      const statusRes = await fetch(
        instagramGraphUrl(creationId, { fields: 'status_code', access_token: ig_access_token })
      )
      const statusData = await statusRes.json()
      if (statusData.status_code === 'FINISHED') break
      if (statusData.status_code === 'ERROR') {
        return NextResponse.json({ error: `Instagram processing failed: ${JSON.stringify(statusData)}` }, { status: 500 })
      }
      attempts++
    }
    if (attempts >= 40) {
      return NextResponse.json({ error: 'Instagram processing timed out after 2 minutes' }, { status: 504 })
    }

    // Step 3: Publish
    const publishParams = new URLSearchParams({
      creation_id: creationId,
      access_token: ig_access_token,
    })
    const publishRes = await fetch(instagramGraphUrl(`${ig_account_id}/media_publish`, {}), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: publishParams,
    })
    const publishData = await publishRes.json()
    if (publishData.error) {
      return NextResponse.json({ error: `Instagram publish error: ${publishData.error.message}` }, { status: 400 })
    }

    const postUrl = `https://www.instagram.com/p/${publishData.id}/`
    return NextResponse.json({ postId: publishData.id, postUrl })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
