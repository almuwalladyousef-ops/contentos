import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { COOKIE_OPTS } from '@/lib/accounts'

export async function POST(req: NextRequest) {
  const { slot } = await req.json()
  if (slot !== 'personal' && slot !== 'business') {
    return NextResponse.json({ error: 'Invalid slot' }, { status: 400 })
  }

  const jar = await cookies()
  // Delete the account cookie for this slot
  jar.set(`cms_${slot}`, '', { ...COOKIE_OPTS, maxAge: 0 })

  // If this was the active slot, clear the active pointer too
  const active = jar.get('cms_active')?.value
  if (active === slot) {
    jar.set('cms_active', '', { ...COOKIE_OPTS, maxAge: 0 })
  }

  return NextResponse.json({ ok: true })
}
