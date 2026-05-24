import { NextResponse } from 'next/server'
import { getAccountsStatus } from '@/lib/accounts'

export function GET() {
  return NextResponse.json(getAccountsStatus())
}
