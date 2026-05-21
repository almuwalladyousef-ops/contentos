import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getCredentials, saveCredentials, ensureFolderStructure } from '@/lib/drive'
import { Credentials } from '@/lib/types'

export async function GET() {
  const session = await auth()
  if (!session?.accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const creds = await getCredentials(session.accessToken)
    return NextResponse.json(creds ?? {})
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const creds = await req.json() as Credentials
    const { rootId } = await ensureFolderStructure(session.accessToken)
    await saveCredentials(session.accessToken, rootId, creds)
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
