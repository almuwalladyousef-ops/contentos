import { NextRequest, NextResponse } from 'next/server'
import { getPersonalAccount, getAccountsStatus } from '@/lib/accounts'
import { getCredentials } from '@/lib/drive'

export async function POST(req: NextRequest) {
  const [account, status] = await Promise.all([getPersonalAccount(), getAccountsStatus()])
  if (!account) return NextResponse.json({ error: 'No account connected' }, { status: 401 })

  try {
    const creds = await getCredentials(account.accessToken, status.active)
    if (!creds?.tt_access_token) {
      return NextResponse.json({ error: 'TikTok not connected' }, { status: 400 })
    }

    const { publishId } = await req.json()
    const statusRes = await fetch('https://open.tiktokapis.com/v2/post/publish/status/fetch/', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${creds.tt_access_token}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({ publish_id: publishId }),
    })

    const data = await statusRes.json()
    return NextResponse.json({ status: data.data?.status, raw: data })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
