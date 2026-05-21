import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { ensureFolderStructure } from '@/lib/drive'

export async function POST() {
  const session = await auth()
  if (!session?.accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const folders = await ensureFolderStructure(session.accessToken)
    return NextResponse.json(folders)
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
