import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { ensureFolderStructure, uploadTempVideo } from '@/lib/drive'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const { tempId } = await ensureFolderStructure(session.accessToken)
    const buffer = Buffer.from(await file.arrayBuffer())
    const uuid = crypto.randomUUID()
    const fileId = await uploadTempVideo(session.accessToken, tempId, buffer, `${uuid}.mp4`)

    const publicUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download`
    return NextResponse.json({ fileId, publicUrl })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
