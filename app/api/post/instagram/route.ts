import { NextRequest, NextResponse } from 'next/server'
import { getPersonalAccount, getAccountsStatus } from '@/lib/accounts'
import { ensureFolderStructure, getCredentials, saveCredentials } from '@/lib/drive'
import { instagramGraphErrorMessage, instagramGraphUrl, resolveInstagramCredentials } from '@/lib/instagram'

export const maxDuration = 120

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

export async function POST(req: NextRequest) {
  const [account, accountsStatus] = await Promise.all([getPersonalAccount(), getAccountsStatus()])
  if (!account) return NextResponse.json({ error: 'No account connected' }, { status: 401 })

  try {
    let creds = await getCredentials(account.accessToken, accountsStatus.active)
    if (!creds?.ig_access_token || !creds?.ig_account_id) {
      return NextResponse.json({ error: 'Instagram credentials not set in Settings' }, { status: 400 })
    }
    const resolved = await resolveInstagramCredentials(creds)
    if (resolved.mediaError) {
      return NextResponse.json({
        error: instagramGraphErrorMessage('Instagram account ID is not a usable Business/Creator account ID. Paste the connected Instagram Business Account ID, not the Facebook Page ID.', resolved.mediaError),
      }, { status: 400 })
    }
    creds = resolved.creds
    if (resolved.changed) {
      const { rootId } = await ensureFolderStructure(account.accessToken)
      await saveCredentials(account.accessToken, rootId, creds, accountsStatus.active)
    }
    if (!creds.ig_access_token || !creds.ig_account_id) {
      return NextResponse.json({ error: 'Instagram credentials not set in Settings' }, { status: 400 })
    }

    const { videoUrl, caption } = await req.json()
    if (!videoUrl) return NextResponse.json({ error: 'No video URL provided' }, { status: 400 })

    const { ig_access_token, ig_account_id } = creds

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
