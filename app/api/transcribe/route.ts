import { NextRequest, NextResponse } from 'next/server'
import { getPersonalAccount } from '@/lib/accounts'
import { transcribeAudio } from '@/lib/groq'
import { getCredentials } from '@/lib/drive'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const account = await getPersonalAccount()
  if (!account) return NextResponse.json({ error: 'No account connected' }, { status: 401 })

  try {
    const creds = await getCredentials(account.accessToken)
    if (!creds?.groq_api_key) return NextResponse.json({ error: 'Groq API key not set in Settings' }, { status: 400 })

    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const transcript = await transcribeAudio(buffer, file.name, creds.groq_api_key)

    return NextResponse.json({ transcript })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
