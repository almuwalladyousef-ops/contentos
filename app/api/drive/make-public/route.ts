import { NextRequest, NextResponse } from 'next/server'
import { getPersonalAccount } from '@/lib/accounts'
import { getDriveClient } from '@/lib/drive'

export async function POST(req: NextRequest) {
  const account = await getPersonalAccount()
  if (!account) return NextResponse.json({ error: 'No account connected' }, { status: 401 })

  try {
    const { fileId } = await req.json()
    const drive = getDriveClient(account.accessToken)
    await drive.permissions.create({
      fileId,
      requestBody: { role: 'reader', type: 'anyone' },
    })
    const publicUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download`
    return NextResponse.json({ publicUrl })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
