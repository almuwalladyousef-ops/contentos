import { put } from '@vercel/blob'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const blob = await put(`test-${Date.now()}.txt`, 'hello from server', {
      access: 'public',
      addRandomSuffix: true,
    })
    return NextResponse.json({ ok: true, url: blob.url })
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message, name: (e as Error).name }, { status: 500 })
  }
}
