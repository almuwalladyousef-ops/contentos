import { NextRequest, NextResponse } from 'next/server'
import { getPersonalAccount, getAccountsStatus } from '@/lib/accounts'
import { getCredentials } from '@/lib/drive'

export async function POST(req: NextRequest) {
  const [account, status] = await Promise.all([getPersonalAccount(), getAccountsStatus()])
  if (!account) return NextResponse.json({ error: 'No account connected' }, { status: 401 })

  try {
    const creds = await getCredentials(account.accessToken, status.active)
    if (!creds?.tt_access_token) {
      return NextResponse.json({ error: 'TikTok access token not set in Settings' }, { status: 400 })
    }

    const { caption, privacy, size } = await req.json()

    const initRes = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${creds.tt_access_token}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({
        post_info: {
          title: caption?.slice(0, 150) || 'New video',
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
    return NextResponse.json({ uploadUrl: upload_url, publishId: publish_id })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
