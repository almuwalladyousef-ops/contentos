import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { transcribeAudio } from '@/lib/groq'
import { getCredentials } from '@/lib/drive'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const creds = await getCredentials(session.accessToken)
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
