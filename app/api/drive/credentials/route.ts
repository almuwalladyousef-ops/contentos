import { NextRequest, NextResponse } from 'next/server'
import { getPersonalAccount, getAccountsStatus } from '@/lib/accounts'
import { getCredentials, saveCredentials, ensureFolderStructure } from '@/lib/drive'
import { Credentials } from '@/lib/types'

export async function GET(req: NextRequest) {
  const account = await getPersonalAccount()
  if (!account) return NextResponse.json({ error: 'No account connected' }, { status: 401 })
  try {
    const slotParam = req.nextUrl.searchParams.get('slot')
    if (slotParam === 'all') {
      const [personal, business] = await Promise.all([
        getCredentials(account.accessToken, 'personal'),
        getCredentials(account.accessToken, 'business'),
      ])
      return NextResponse.json({ personal: personal ?? {}, business: business ?? {} })
    }
    const status = await getAccountsStatus()
    const slot = slotParam ?? status.active
    const creds = await getCredentials(account.accessToken, slot)
    return NextResponse.json(creds ?? {})
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const [account, status] = await Promise.all([getPersonalAccount(), getAccountsStatus()])
  if (!account) return NextResponse.json({ error: 'No account connected' }, { status: 401 })
  try {
    const body = await req.json() as Credentials & { slot?: string }
    const slot = body.slot ?? status.active
    const { slot: _unused, ...creds } = body; void _unused
    const { rootId } = await ensureFolderStructure(account.accessToken)
    await saveCredentials(account.accessToken, rootId, creds as Credentials, slot)
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
