import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { analyzeTranscript } from '@/lib/gemini'
import { getCredentials } from '@/lib/drive'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const creds = await getCredentials(session.accessToken)
    if (!creds?.gemini_api_key) return NextResponse.json({ error: 'Gemini API key not set in Settings' }, { status: 400 })

    const { transcript } = await req.json()
    if (!transcript) return NextResponse.json({ error: 'No transcript provided' }, { status: 400 })

    const analysis = await analyzeTranscript(transcript, creds.gemini_api_key)
    return NextResponse.json({ analysis })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
