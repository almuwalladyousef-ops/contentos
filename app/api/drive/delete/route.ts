import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { deleteFile } from '@/lib/drive'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { fileId } = await req.json()
    await deleteFile(session.accessToken, fileId)
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
