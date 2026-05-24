import { NextRequest, NextResponse } from 'next/server'
import { switchAccount, AccountSlot } from '@/lib/accounts'

export async function POST(req: NextRequest) {
  const { slot } = await req.json()
  switchAccount(slot as AccountSlot)
  return NextResponse.json({ ok: true })
}
