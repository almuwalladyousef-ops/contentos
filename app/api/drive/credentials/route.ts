import { NextRequest, NextResponse } from 'next/server'
import { getActiveAccount } from '@/lib/accounts'
import { getCredentials, saveCredentials, ensureFolderStructure } from '@/lib/drive'
import { Credentials } from '@/lib/types'

export async function GET() {
  const account = await getActiveAccount()
  if (!account) return NextResponse.json({ error: 'No account connected' }, { status: 401 })
  try {
    const creds = await getCredentials(account.accessToken)
    return NextResponse.json(creds ?? {})
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const account = await getActiveAccount()
  if (!account) return NextResponse.json({ error: 'No account connected' }, { status: 401 })
  try {
    const creds = await req.json() as Credentials
    const { rootId } = await ensureFolderStructure(account.accessToken)
    await saveCredentials(account.accessToken, rootId, creds)
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
