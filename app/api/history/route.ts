import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getHistory, addHistoryEntry, clearHistory } from '@/lib/history'
import { PostRecord } from '@/lib/types'

export async function GET() {
  const session = await auth()
  if (!session?.accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const history = await getHistory(session.accessToken)
    return NextResponse.json(history)
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { action, entry } = await req.json()
    if (action === 'clear') {
      await clearHistory(session.accessToken)
    } else if (action === 'add' && entry) {
      await addHistoryEntry(session.accessToken, entry as PostRecord)
    }
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
