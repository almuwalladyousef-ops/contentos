import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getDriveClient } from '@/lib/drive'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const fileId = req.nextUrl.searchParams.get('fileId')
  if (!fileId) return NextResponse.json({ error: 'fileId required' }, { status: 400 })

  try {
    const drive = getDriveClient(session.accessToken)
    const res = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'text' })
    return NextResponse.json(JSON.parse(res.data as string))
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
