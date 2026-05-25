import { generateClientTokenFromReadWriteToken } from '@vercel/blob/client'
import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 30

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { pathname } = await req.json()
    if (!pathname) {
      return NextResponse.json({ error: 'No pathname provided' }, { status: 400 })
    }
    const token = await generateClientTokenFromReadWriteToken({
      pathname,
      onUploadCompleted: undefined as never,
      allowedContentTypes: ['video/mp4', 'video/quicktime', 'video/mov', 'video/avi', 'video/webm', 'video/x-m4v'],
      maximumSizeInBytes: 5 * 1024 * 1024 * 1024,
      validUntil: Date.now() + 60 * 60 * 1000,
      addRandomSuffix: true,
    })
    return NextResponse.json({ token })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
