import { NextRequest, NextResponse } from 'next/server'
import { getPersonalAccount } from '@/lib/accounts'
import { ensureFolderStructure } from '@/lib/drive'

export async function POST(req: NextRequest) {
  const account = await getPersonalAccount()
  if (!account) return NextResponse.json({ error: 'No account connected' }, { status: 401 })

  try {
    const { size, type } = await req.json()
    const { tempId } = await ensureFolderStructure(account.accessToken)
    const name = `${crypto.randomUUID()}.mp4`

    const initRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${account.accessToken}`,
          'Content-Type': 'application/json',
          'X-Upload-Content-Type': type || 'video/mp4',
          'X-Upload-Content-Length': String(size),
        },
        body: JSON.stringify({ name, parents: [tempId] }),
      }
    )

    if (!initRes.ok) {
      const err = await initRes.text()
      return NextResponse.json({ error: `Drive init failed: ${err}` }, { status: initRes.status })
    }

    const uploadUri = initRes.headers.get('Location')
    if (!uploadUri) return NextResponse.json({ error: 'No upload URI returned' }, { status: 500 })

    return NextResponse.json({ uploadUri })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
