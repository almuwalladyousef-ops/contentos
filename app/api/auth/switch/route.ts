import { NextRequest, NextResponse } from 'next/server'
import { switchAccount, toAccountSlot } from '@/lib/accounts'

export async function POST(req: NextRequest) {
  const { slot } = await req.json()
  await switchAccount(toAccountSlot(slot))
  return NextResponse.json({ ok: true })
}
