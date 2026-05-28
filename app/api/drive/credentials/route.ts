import { NextRequest, NextResponse } from 'next/server'
import { getPersonalAccount, getAccountsStatus, toAccountSlot } from '@/lib/accounts'
import { getCredentials, saveCredentials, ensureFolderStructure } from '@/lib/drive'
import { Credentials } from '@/lib/types'

function stripInstagramCredentials(creds: Credentials): Credentials {
  const { ig_access_token: _token, ig_account_id: _accountId, ...rest } = creds
  void _token
  void _accountId
  return rest
}

function hasInstagramCredentials(creds: Credentials | null) {
  return !!creds?.ig_access_token || !!creds?.ig_account_id
}

export async function GET(req: NextRequest) {
  const account = await getPersonalAccount()
  if (!account) return NextResponse.json({ error: 'No account connected' }, { status: 401 })
  try {
    const slotParam = req.nextUrl.searchParams.get('slot')
    if (slotParam === 'all') {
      let [personal, business] = await Promise.all([
        getCredentials(account.accessToken, 'personal'),
        getCredentials(account.accessToken, 'business'),
      ])
      if (hasInstagramCredentials(personal)) {
        personal = stripInstagramCredentials(personal!)
        const { rootId } = await ensureFolderStructure(account.accessToken)
        await saveCredentials(account.accessToken, rootId, personal, 'personal')
      }
      return NextResponse.json({ personal: personal ?? {}, business: business ?? {} })
    }
    const status = await getAccountsStatus()
    const slot = toAccountSlot(slotParam, status.active)
    let creds = await getCredentials(account.accessToken, slot)
    if (slot === 'personal' && hasInstagramCredentials(creds)) {
      creds = stripInstagramCredentials(creds!)
      const { rootId } = await ensureFolderStructure(account.accessToken)
      await saveCredentials(account.accessToken, rootId, creds, slot)
    }
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
    const slot = toAccountSlot(body.slot, status.active)
    const { slot: _unused, ...creds } = body; void _unused
    const savedCreds = slot === 'personal' ? stripInstagramCredentials(creds as Credentials) : creds as Credentials
    const { rootId } = await ensureFolderStructure(account.accessToken)
    await saveCredentials(account.accessToken, rootId, savedCreds, slot)
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
