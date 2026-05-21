import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { ensureFolderStructure, writeJsonFile, writeTextFile } from '@/lib/drive'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { transcript, analysis, name, timestamp } = await req.json()
    const { analysisId, transcriptsId } = await ensureFolderStructure(session.accessToken)

    const analysisFileId = await writeJsonFile(
      session.accessToken,
      analysisId,
      `${name}-${timestamp}-analysis.json`,
      analysis
    )

    const transcriptFileId = await writeTextFile(
      session.accessToken,
      transcriptsId,
      `${name}-${timestamp}-transcript.txt`,
      transcript
    )

    return NextResponse.json({ analysisFileId, transcriptFileId })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
