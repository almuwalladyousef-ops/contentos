import { NextRequest, NextResponse } from 'next/server'
import { getPersonalAccount } from '@/lib/accounts'
import { ensureFolderStructure, uploadTempVideo } from '@/lib/drive'

export async function POST(req: NextRequest) {
  const account = await getPersonalAccount()
  if (!account) return NextResponse.json({ error: 'No account connected' }, { status: 401 })

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const { tempId } = await ensureFolderStructure(account.accessToken)
    const buffer = Buffer.from(await file.arrayBuffer())
    const uuid = crypto.randomUUID()
    const fileId = await uploadTempVideo(account.accessToken, tempId, buffer, `${uuid}.mp4`)

    const publicUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download`
    return NextResponse.json({ fileId, publicUrl })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
