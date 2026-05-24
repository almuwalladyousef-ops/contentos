import { NextResponse } from 'next/server'
import { getAccountsStatus } from '@/lib/accounts'

export async function GET() {
  return NextResponse.json(await getAccountsStatus())
}
